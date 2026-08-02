import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import PizZip from "pizzip";

import {
  DEFAULT_OTHER_NOTES,
  DEVICE_TYPE_OPTIONS,
  ENERGY_CATEGORY_OPTIONS,
  INSTALLATION_CATEGORY_GROUPS,
  parseCaseForm
} from "./schema.js";

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

function formatKwValue(value) {
  const normalized = normalize(value);
  return normalized ? `${normalized} 瓩` : "";
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

function deviceTypeLine(value) {
  return DEVICE_TYPE_OPTIONS.map((option) => checkboxLine(value, option, option)).join("  ");
}

function energyCategoryLine(value) {
  return ENERGY_CATEGORY_OPTIONS.map((option) => checkboxLine(value, option, option)).join("  ");
}

function installationCategoryLine(category, selected) {
  const options = INSTALLATION_CATEGORY_GROUPS[category] ?? [];
  return options.map((option) => checkboxLine(selected, option, option)).join("  ");
}

function otherNotesBlock(formData) {
  const lines = [];
  const detailReviewLine = `配電級再生能源${checkboxLine(formData.detailReview, "需", "需")}${checkboxLine(formData.detailReview, "不需", "不需")} 台電公司於核發審查意見書後即進行細部協商。(註12)勾選日期：${normalize(formData.detailReviewDate)}`;
  const externalDesignLine = `配電級再生能源${checkboxLine(formData.externalDesign, "需", "需")}${checkboxLine(formData.externalDesign, "不需", "不需")} 台電公司於核發審查意見書後即進行外線設計。(註13)勾選日期：${normalize(formData.externalDesignDate)}`;

  lines.push(detailReviewLine, externalDesignLine);

  const notes = normalize(formData.otherNotes).replace(/\r/g, "\n");
  if (notes) lines.push(notes);

  return lines.join("\n");
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
    deviceTypeLine: deviceTypeLine(formData.deviceType),
    energyCategoryLine: energyCategoryLine(formData.energyCategory),
    solarCategoryLine: solarCategoryLine(formData.solarCategory),
    windCategoryLine: installationCategoryLine("風力", formData.solarCategory),
    biomassCategoryLine: installationCategoryLine("生質能", formData.solarCategory),
    wasteCategoryLine: installationCategoryLine("廢棄物", formData.solarCategory),
    installedExisting: formatKwValue(formData.installedExisting),
    installedNew: formatKwValue(formData.installedNew),
    installedTotal: formatKwValue(formData.installedTotal),
    saleExisting: formatKwValue(formData.saleExisting),
    saleNew: formatKwValue(formData.saleNew),
    saleTotal: formatKwValue(formData.saleTotal),
    parallelMethod: formData.parallelMethod,
    innerLineNumber: normalize(formData.innerLineNumber),
    contractType: normalize(formData.contractType),
    contractCapacity: normalize(formData.contractCapacity),
    saleMode: formData.saleMode,
    boundaryVoltage: normalize(formData.boundaryVoltage),
    parallelPointVoltage: normalize(formData.parallelPointVoltage),
    estimatedParallelDateRoc: rocDateString(formData.estimatedParallelDate),
    relatedCaseNumber: normalize(formData.relatedCaseNumber),
    otherNotes: otherNotesBlock(formData) || DEFAULT_OTHER_NOTES,
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
const DEFAULT_VALUE_PARAGRAPH = (fieldName) =>
  `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="標楷體" w:hAnsi="標楷體"/></w:rPr><w:t>{{${fieldName}}}</w:t></w:r></w:p>`;
const SIGNATURE_PARAGRAPH =
  '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="280" w:lineRule="exact"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="標楷體" w:eastAsia="標楷體" w:hAnsi="標楷體"/></w:rPr><w:t>申請人</w:t></w:r><w:r><w:br/><w:t>簽章</w:t></w:r></w:p>';

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

function adjustSiteAddressRow(documentXml) {
  return documentXml.replace(/<w:tr\b[\s\S]*?\{\{siteAddress\}\}[\s\S]*?<\/w:tr>/, (rowXml) => {
    const withLabel = rowXml.replace(
      /<w:t>\{\{siteAddress\}\}<\/w:t>/,
      "<w:t>設置場所或地點（註3）</w:t>"
    );

    return withLabel.replace(
      /(<w:t>設置場所或地點（註3）<\/w:t>[\s\S]*?<\/w:tc><w:tc\b[\s\S]*?<w:tcPr>[\s\S]*?<\/w:tcPr>)(?:<w:p\b[\s\S]*?<\/w:p>)/,
      `$1${DEFAULT_VALUE_PARAGRAPH("siteAddress")}`
    );
  });
}

function adjustBoundaryVoltageSignatureCell(documentXml) {
  return documentXml.replace(
    /(<w:tc><w:tcPr><w:tcW w:w="983" w:type="dxa"\/><w:gridSpan w:val="2"\/><w:vMerge w:val="restart"\/>[\s\S]*?<\/w:tcPr>)(?:<w:p\b[\s\S]*?<\/w:p>)(<\/w:tc>)/,
    `$1${SIGNATURE_PARAGRAPH}$2`
  );
}

function applyTemplateLayoutFixes(documentXml) {
  return adjustBoundaryVoltageSignatureCell(
    adjustSiteAddressRow(
      adjustContactPersonRows(
        documentXml.replace(CONTACT_PERSON_CELL_PATTERN, adjustContactPersonCell)
      )
    )
  );
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function applyTemplateSelectionState(documentXml, payload) {
  const replacements = [
    [
      /[■□]第一型  [■□]第二型  [■□]第三型/g,
      payload.deviceTypeLine
    ],
    [
      /[■□]太陽光電  [■□]小水力  [■□]生質能  [■□]風力  [■□]地熱能  [■□]廢棄物  [■□]氫能  [■□]燃料電池  [■□]海洋能/g,
      payload.energyCategoryLine
    ],
    [
      /太陽光電-[■□]屋頂  [■□]地面  [■□]水面/g,
      `太陽光電-${payload.solarCategoryLine}`
    ],
    [
      /風力-[■□]陸域  [■□]離岸/g,
      `風力-${payload.windCategoryLine}`
    ],
    [
      /生質能-[■□]無  [■□]有厭氧消化設備  [■□]農林植物/g,
      `生質能-${payload.biomassCategoryLine}`
    ],
    [
      /廢棄物-[■□]一般  [■□]農業/g,
      `廢棄物-${payload.wasteCategoryLine}`
    ],
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
