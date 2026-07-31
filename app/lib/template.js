import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import PizZip from "pizzip";

import { DEFAULT_OTHER_NOTES, parseCaseForm } from "./schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const assetsDir = path.join(projectRoot, "assets");
const templatePath = path.join(assetsDir, "official-template-fillable.docx");
const execFileAsync = promisify(execFile);
const SOFFICE_CANDIDATES = [
  process.env.SOFFICE_PATH,
  "soffice",
  "/opt/homebrew/bin/soffice",
  "/Applications/LibreOffice.app/Contents/MacOS/soffice"
].filter(Boolean);
let templatePromise;

function normalize(value) {
  return String(value ?? "").trim();
}

function rocDateString(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";
  return `${year - 1911} 年 ${month} 月 ${day} 日`;
}

function solarCategoryLine(value) {
  const selected = normalize(value);
  const options = ["屋頂", "地面", "水面"];
  return options
    .map((option) => (option === selected ? `■${option}` : `□${option}`))
    .join("  ");
}

export function buildDocumentPayload(data) {
  const formData = parseCaseForm(data);
  const normalizedOtherNotes = normalize(formData.otherNotes).replace(/\r/g, "\n");

  return {
    caseNumber: "",
    districtOffice: "",
    ownerName: normalize(formData.ownerName),
    principalName: normalize(formData.principalName),
    electricNumber: "",
    ownerAddress: normalize(formData.ownerAddress),
    ownerPhone: normalize(formData.ownerPhone),
    siteAddress: normalize(formData.siteAddress),
    contactPerson: normalize(formData.contactPerson),
    contactAddress: normalize(formData.contactAddress),
    contactPhone: normalize(formData.contactPhone),
    solarCategoryLine: solarCategoryLine(formData.solarCategory),
    installedExisting: "",
    installedNew: normalize(formData.installedNew),
    installedTotal: normalize(formData.installedTotal),
    saleExisting: "",
    saleNew: normalize(formData.saleNew),
    saleTotal: normalize(formData.saleTotal),
    innerLineNumber: "",
    contractType: "",
    contractCapacity: "",
    boundaryVoltage: normalize(formData.boundaryVoltage),
    parallelPointVoltage: normalize(formData.parallelPointVoltage),
    estimatedParallelDateRoc: rocDateString(formData.estimatedParallelDate),
    relatedCaseNumber: "",
    otherNotes: normalizedOtherNotes || DEFAULT_OTHER_NOTES,
    applicationDateRoc: rocDateString(formData.applicationDate)
  };
}

async function getTemplateBytes() {
  if (!templatePromise) {
    templatePromise = readFile(templatePath);
  }
  return templatePromise;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xmlValue(value) {
  const normalized = String(value ?? "");
  if (!normalized) return "";
  return normalized
    .split("\n")
    .map((line) => escapeXml(line))
    .join("</w:t><w:br/><w:t>");
}

const CONTACT_PERSON_CELL_PATTERN =
  /<w:tc\b(?:(?!<\/w:tc>)[\s\S])*?\{\{contactPerson\}\}(?:(?!<\/w:tc>)[\s\S])*?<\/w:tc>/g;
const CONTACT_PERSON_SPACING =
  '<w:spacing w:before="180" w:after="0" w:line="240" w:lineRule="exact"/>';

function adjustContactPersonCell(cellXml) {
  let next = cellXml;

  if (next.includes("<w:tcMar>")) {
    next = next
      .replace(/<w:top w:w="\d+" w:type="dxa"\/>/, '<w:top w:w="120" w:type="dxa"/>')
      .replace(/<w:bottom w:w="\d+" w:type="dxa"\/>/, '<w:bottom w:w="120" w:type="dxa"/>');
  } else {
    next = next.replace(
      "</w:tcPr>",
      '<w:tcMar><w:top w:w="120" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tcMar></w:tcPr>'
    );
  }

  if (next.includes("<w:pPr>")) {
    if (/<w:spacing\b[^>]*\/>/.test(next)) {
      next = next.replace(/<w:spacing\b[^>]*\/>/, CONTACT_PERSON_SPACING);
    } else {
      next = next.replace("<w:pPr>", `<w:pPr>${CONTACT_PERSON_SPACING}`);
    }
  } else {
    next = next.replace("<w:p>", `<w:p><w:pPr>${CONTACT_PERSON_SPACING}</w:pPr>`);
  }

  if (!next.includes('<w:vAlign w:val="center"/>')) {
    next = next.replace("</w:tcPr>", '<w:vAlign w:val="center"/></w:tcPr>');
  }

  return next;
}

function adjustContactPersonRows(documentXml) {
  return documentXml.replace(/<w:tr\b[\s\S]*?<\/w:tr>/g, (rowXml) => {
    const isContactRow =
      rowXml.includes("{{contactPerson}}") ||
      (rowXml.includes("<w:vMerge/>") && rowXml.includes("連絡電話"));

    if (!isContactRow) return rowXml;

    return rowXml.replace(
      /<w:trHeight w:val="(\d+)"\/>/g,
      '<w:trHeight w:val="$1" w:hRule="exact"/>'
    );
  });
}

function applyTemplateLayoutFixes(documentXml) {
  return adjustContactPersonRows(
    documentXml.replace(CONTACT_PERSON_CELL_PATTERN, adjustContactPersonCell)
  );
}

export async function renderOfficialDocx(formData) {
  const templateBytes = await getTemplateBytes();
  const zip = new PizZip(templateBytes);
  const payload = buildDocumentPayload(formData);
  let documentXml = zip.file("word/document.xml").asText();

  documentXml = applyTemplateLayoutFixes(documentXml);

  for (const [key, value] of Object.entries(payload)) {
    documentXml = documentXml.replaceAll(`{{${key}}}`, xmlValue(value));
  }

  zip.file("word/document.xml", documentXml);
  return zip.generate({ type: "nodebuffer" });
}

async function convertViaSoffice(docxBuffer) {
  const workDir = await mkdtemp(path.join(os.tmpdir(), "lihipdf-"));
  const inputPath = path.join(workDir, "input.docx");
  const outputPath = path.join(workDir, "input.pdf");

  try {
    await writeFile(inputPath, docxBuffer);

    let lastError;
    for (const sofficePath of SOFFICE_CANDIDATES) {
      try {
        await execFileAsync(sofficePath, [
          "--headless",
          "--convert-to",
          "pdf",
          "--outdir",
          workDir,
          inputPath
        ]);
        return await readFile(outputPath);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error("No LibreOffice executable available");
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export async function renderOfficialPdf(formData) {
  const docxBuffer = await renderOfficialDocx(formData);
  return convertViaSoffice(docxBuffer);
}
