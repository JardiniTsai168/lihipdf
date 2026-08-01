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

function checkboxLine(selected, value, label) {
  return `${selected === value ? "■" : "□"}${label}`;
}

function requestPair(selected) {
  return `${checkboxLine(selected, "需", "需")}${checkboxLine(selected, "不需", "不需")}`;
}

function buildStructuredNotes(formData) {
  const notes = [];

  notes.push(
    `配電級再生能源${requestPair(formData.detailNegotiation)} 台電公司於核發審查意見書後即進行細部協商。(註12)勾選日期：${rocDateString(formData.detailNegotiationDate)}`
  );
  notes.push(
    `配電級再生能源${requestPair(formData.externalLineDesign)} 台電公司於核發審查意見書後即進行外線設計。(註13)勾選日期：${rocDateString(formData.externalLineDesignDate)}`
  );

  const extraNotes = normalize(formData.otherNotes).replace(/\r/g, "\n");
  if (extraNotes) {
    notes.push(extraNotes);
  }

  return notes.join("\n");
}

export function buildDocumentPayload(data) {
  const formData = parseCaseForm(data);

  return {
    caseNumber: normalize(formData.caseNumber),
    districtOffice: normalize(formData.districtOffice),
    ownerName: normalize(formData.ownerName),
    principalName: normalize(formData.principalName),
    electricNumber: normalize(formData.electricNumber),
    ownerAddress: normalize(formData.ownerAddress),
    ownerPhone: normalize(formData.ownerPhone),
    siteAddress: normalize(formData.siteAddress),
    contactPerson: normalize(formData.contactPerson),
    contactAddress: normalize(formData.contactAddress),
    contactPhone: normalize(formData.contactPhone),
    solarCategoryLine: solarCategoryLine(formData.solarCategory),
    installedExisting: normalize(formData.installedExisting),
    installedNew: normalize(formData.installedNew),
    installedTotal: normalize(formData.installedTotal),
    saleExisting: normalize(formData.saleExisting),
    saleNew: normalize(formData.saleNew),
    saleTotal: normalize(formData.saleTotal),
    parallelMethod: formData.parallelMethod,
    innerLineNumber: normalize(formData.innerLineNumber),
    contractType: normalize(formData.contractType),
    contractCapacity: normalize(formData.contractCapacity),
    saleMode: formData.saleMode,
    boundaryVoltage: normalize(formData.boundaryVoltage),
    parallelPointVoltage: normalize(formData.parallelPointVoltage),
    estimatedParallelDateRoc: rocDateString(formData.estimatedParallelDate),
    relatedCaseNumber: normalize(formData.relatedCaseNumber),
    otherNotes: buildStructuredNotes(formData) || DEFAULT_OTHER_NOTES,
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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyTemplateSelectionState(documentXml, payload) {
  const replacements = [
    [
      /[■□]併聯台電外線/g,
      checkboxLine(payload.parallelMethod, "台電外線", "併聯台電外線")
    ],
    [
      new RegExp(`[■□]併聯用戶內線，電號：${escapeRegex(payload.innerLineNumber)}`, "g"),
      checkboxLine(payload.parallelMethod, "用戶內線", `併聯用戶內線，電號：${payload.innerLineNumber}`)
    ],
    [
      /[■□]僅併聯不躉售/g,
      checkboxLine(payload.saleMode, "僅併聯不躉售", "僅併聯不躉售")
    ],
    [
      /[■□]全額躉售/g,
      checkboxLine(payload.saleMode, "全額躉售", "全額躉售")
    ],
    [
      /[■□]自發自用\(餘電躉售\)/g,
      checkboxLine(payload.saleMode, "自發自用(餘電躉售)", "自發自用(餘電躉售)")
    ],
    [
      /[■□]直供餘電躉售\(限第一型\)/g,
      checkboxLine(payload.saleMode, "直供餘電躉售(限第一型)", "直供餘電躉售(限第一型)")
    ],
    [
      /[■□]轉供餘電躉售/g,
      checkboxLine(payload.saleMode, "轉供餘電躉售", "轉供餘電躉售")
    ],
    [
      /[■□]轉供自用\(第二、三型\)/g,
      checkboxLine(payload.saleMode, "轉供自用(第二、三型)", "轉供自用(第二、三型)")
    ]
  ];

  return replacements.reduce(
    (xml, [pattern, replacement]) => xml.replace(pattern, replacement),
    documentXml
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

  documentXml = applyTemplateSelectionState(documentXml, payload);

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
