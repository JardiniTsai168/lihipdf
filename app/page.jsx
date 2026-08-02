"use client";

import React from "react";
import { useEffect, useState } from "react";
import PizZip from "pizzip";

import {
  ADVANCED_OPTION_CHOICES,
  CASE_FORM_DEFAULTS,
  DEVICE_TYPE_OPTIONS,
  ENERGY_CATEGORY_OPTIONS,
  INSTALLATION_CATEGORY_GROUPS,
  validateCaseForm
} from "./lib/schema";

const STORAGE_KEY = "lihipdf_single_form_v2";

const sections = [
  {
    title: "案件與設置者資料",
    description: "主流程先照你指定的順序走，先把案件代號、設置者與場址資訊排直。",
    fields: [
      ["caseNumber", "編號", "text"],
      ["districtOffice", "區處", "text"],
      ["ownerName", "設置者名稱", "text"],
      ["principalName", "負責人", "text"],
      ["electricNumber", "電號", "text"],
      ["ownerAddress", "通訊處", "text"],
      ["ownerPhone", "連絡電話", "tel"],
      ["siteAddress", "設置場所或地點（註3）", "text"]
    ]
  },
  {
    title: "聯絡窗口",
    description: "聯絡人維持 Word 的三連欄順序，不再插其他欄位進來。",
    fields: [
      ["contactPerson", "連絡人", "text"],
      ["contactAddress", "通訊處", "text"],
      ["contactPhone", "連絡電話", "tel"]
    ]
  },
  {
    title: "設備與容量",
    description: "設備型別、能源類別與設置分類都改成可選，容量欄位接著往下填。",
    fields: [
      ["deviceType", "再生能源發電設備型別", "deviceType"],
      ["energyCategory", "再生能源類別", "energyCategory"],
      ["solarCategory", "設置分類", "installationCategory"],
      ["installedNew", "裝置容量新（增）設（瓩）", "number"],
      ["installedTotal", "裝置容量合計（瓩）", "number"],
      ["saleNew", "躉售容量新（增）設（瓩）", "number"],
      ["saleTotal", "躉售容量合計（瓩）", "number"]
    ],
    detailFields: [
      ["installedExisting", "裝置容量既設（瓩）", "number"],
      ["saleExisting", "躉售容量既設（瓩）", "number"]
    ]
  },
  {
    title: "併聯與售電方式",
    description: "最後接併聯、售電、電壓、日期與補充說明，主流程就照你剛列的那串。",
    fields: [
      ["parallelMethod", "預計併聯方式", "parallelMethod"],
      ["innerLineNumber", "電號", "text"],
      ["contractType", "契約種別", "text"],
      ["contractCapacity", "契約容量", "text"],
      ["saleMode", "售電方式", "saleMode"],
      ["boundaryVoltage", "責任分界點電壓", "text"],
      ["parallelPointVoltage", "併聯點電壓", "text"],
      ["estimatedParallelDate", "預計併聯日期", "date"],
      ["relatedCaseNumber", "與本案相關案件編號", "text"],
      ["otherNotes", "其他事項", "otherNotes"]
    ]
  },
  {
    title: "公司預設資料",
    description: "這區不進主流程，只留給快速套用聯絡資訊。",
    fields: [
      ["companyName", "公司名稱", "text"],
      ["companyContactPerson", "公司聯絡人", "text"],
      ["companyPhone", "公司電話", "tel"],
      ["companyAddress", "公司地址", "text"],
      ["companyTaxId", "公司統編", "text"]
    ]
  },
  {
    title: "文件資訊",
    description: "申請日期保留獨立放最後，匯出前再補最順手。",
    fields: [
      ["applicationDate", "申請日期", "date"]
    ]
  }
];

const FIELD_HINTS = {
  applicationDate: "例：2026-08-01",
  ownerName: "例：王小明",
  principalName: "例：王大明",
  ownerPhone: "例：0912-345-678",
  ownerAddress: "例：高雄市鼓山區明德路31號",
  siteAddress: "例：高雄市大寮區光明路88號",
  contactPerson: "例：陳先生",
  contactPhone: "例：07-7338588",
  contactAddress: "例：高雄市鳥松區大同路2-58號",
  caseNumber: "內部案件編號",
  districtOffice: "例：高雄區處",
  electricNumber: "例：12-34-5678-90-1",
  installedExisting: "沒有可留白",
  installedNew: "例：9",
  installedTotal: "例：9",
  saleExisting: "沒有可留白",
  saleNew: "例：9",
  saleTotal: "例：9",
  contractCapacity: "例：49.5",
  parallelMethod: "選擇併聯台電外線或併聯用戶內線",
  saleMode: "依申請案型選一種售電方式",
  innerLineNumber: "併聯用戶內線時填寫",
  contractType: "例：低壓電力",
  estimatedParallelDate: "例：2026-12-31",
  companyName: "例：某某能源股份有限公司",
  companyContactPerson: "例：鄒侑廷",
  companyPhone: "例：0939-255-192",
  companyAddress: "例：高雄市前鎮區成功路88號",
  companyTaxId: "例：12345678",
  detailReviewDate: "勾選日期",
  externalDesignDate: "勾選日期",
  otherNotes: "若有補充說明再填"
};

const FIELD_ARIA_LABELS = {
  siteAddress: "設置場所或地點",
  contactAddress: "連絡人通訊處",
  contactPhone: "連絡人電話",
  installedNew: "裝置容量_新增設_瓩",
  installedTotal: "裝置容量_合計_瓩",
  saleNew: "躉售容量_新增設_瓩",
  saleTotal: "躉售容量_合計_瓩",
  contractCapacity: "契約容量_瓩"
};

function loadDraft() {
  if (typeof window === "undefined") return CASE_FORM_DEFAULTS;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return CASE_FORM_DEFAULTS;

  try {
    return { ...CASE_FORM_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return CASE_FORM_DEFAULTS;
  }
}

function summarizeIssues(result) {
  if (result.success) return [];
  return [...new Set(result.error.issues.map((issue) => issue.message))];
}

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

function buildDocumentPayload(formData) {
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
    otherNotes: otherNotesBlock(formData),
    applicationDateRoc: rocDateString(formData.applicationDate)
  };
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

async function renderDocxBuffer(formData) {
  const templateUrl = new URL("official-template-fillable.docx", document.baseURI);
  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error(`template fetch failed: ${response.status}`);
  }
  const templateBytes = await response.arrayBuffer();
  const zip = new PizZip(templateBytes);
  let documentXml = zip.file("word/document.xml").asText();
  const payload = buildDocumentPayload(formData);

  documentXml = applyTemplateLayoutFixes(documentXml);

  for (const [key, value] of Object.entries(payload)) {
    documentXml = documentXml.replaceAll(`{{${key}}}`, xmlValue(value));
  }

  documentXml = applyTemplateSelectionState(documentXml, payload);

  zip.file("word/document.xml", documentXml);
  return zip.generate({ type: "uint8array" });
}

function PreviewItem({ label, value }) {
  return (
    <div className="preview-item">
      <span>{label}</span>
      <strong>{value || "未填"}</strong>
    </div>
  );
}

const BASE_REQUIRED_FIELDS = new Set([
  "ownerName",
  "ownerPhone",
  "ownerAddress",
  "siteAddress",
  "contactPerson",
  "contactPhone",
  "contactAddress",
  "installedNew",
  "installedTotal",
  "boundaryVoltage",
  "parallelPointVoltage",
  "estimatedParallelDate"
]);

function isFieldRequired(name, formData) {
  if (BASE_REQUIRED_FIELDS.has(name)) return true;
  if ((name === "saleNew" || name === "saleTotal") && formData.saleMode !== "僅併聯不躉售") return true;
  if (name === "innerLineNumber" && formData.parallelMethod === "用戶內線") {
    return true;
  }
  if (name === "solarCategory" && INSTALLATION_CATEGORY_GROUPS[formData.energyCategory]) return true;
  return false;
}

function isFieldVisible(name, formData) {
  if (
    (name === "innerLineNumber" || name === "contractType" || name === "contractCapacity") &&
    formData.parallelMethod !== "用戶內線"
  ) {
    return false;
  }
  return true;
}

function buildSectionSnapshot(formData) {
  return [
    {
      title: "固定設備型別",
      value: "第三型 / 太陽光電"
    },
    {
      title: "預設聯絡窗口",
      value: normalize(formData.companyContactPerson) && normalize(formData.companyPhone)
        ? `${formData.companyContactPerson} / ${formData.companyPhone}`
        : "先填公司聯絡人 / 電話"
    },
    {
      title: "目前案件",
      value: normalize(formData.ownerName) || "先填設置者名稱"
    }
  ];
}

function countFilledFields(formData, fields) {
  return fields.reduce((total, [name]) => {
    if (!isFieldVisible(name, formData)) return total;
    return normalize(formData[name]) ? total + 1 : total;
  }, 0);
}

function fieldState(name, value, formData) {
  if (!isFieldRequired(name, formData)) return normalize(value) ? "filled" : "optional";
  return normalize(value) ? "filled" : "missing";
}

function renderField(name, label, type, form, updateField, variant = "core") {
  if (!isFieldVisible(name, form)) return null;

  const placeholder = FIELD_HINTS[name];
  const hint = FIELD_HINTS[name];
  const ariaLabel = FIELD_ARIA_LABELS[name] ?? label;
  const badgeLabel = variant === "detail" ? "補充" : "主要";
  const state = fieldState(name, form[name], form);
  const isRequired = isFieldRequired(name, form);
  const optionMap = {
    deviceType: DEVICE_TYPE_OPTIONS,
    energyCategory: ENERGY_CATEGORY_OPTIONS,
    parallelMethod: ["台電外線", "用戶內線"],
    saleMode: [
      "僅併聯不躉售",
      "全額躉售",
      "自發自用(餘電躉售)",
      "直供餘電躉售(限第一型)",
      "轉供餘電躉售",
      "轉供自用(第二、三型)"
    ]
  };

  return (
    <label className={`field ${type === "textarea" || type === "otherNotes" ? "field-wide" : ""} is-${state}`} key={name}>
      <div className="field-rail">
        <div className={`field-state ${state}`} aria-hidden="true" />
      </div>
      <div className="field-frame">
        <div className="field-head">
          <span>
            {label}
            {isRequired ? <i className="required-dot">必填</i> : null}
          </span>
          <div className="field-meta">
            <em className={`field-badge ${variant}`}>{badgeLabel}</em>
            <b className={`field-status ${state}`}>
              {state === "filled" ? "已填" : state === "missing" ? "待補" : "可留白"}
            </b>
          </div>
        </div>
        {hint ? <p className="field-note">{hint}</p> : null}
        {type === "otherNotes" ? (
          <div className="other-notes-stack">
            <div className="advanced-option">
              <div className="hint">配電級再生能源 台電公司於核發審查意見書後即進行細部協商。(註12)</div>
              <div className="choice-row">
                <div className="choice-group is-binary" role="radiogroup" aria-label="細部協商">
                  {ADVANCED_OPTION_CHOICES.map((option) => (
                    <button
                      type="button"
                      key={option}
                      className={`choice-pill ${form.detailReview === option ? "is-active" : ""}`}
                      onClick={() => updateField("detailReview", option)}
                    >
                      <span className="choice-mark" aria-hidden="true">
                        {form.detailReview === option ? "■" : "□"}
                      </span>
                      {option}
                    </button>
                  ))}
                </div>
                <input
                  aria-label="細部協商勾選日期"
                  type="date"
                  value={form.detailReviewDate}
                  onChange={(event) => updateField("detailReviewDate", event.target.value)}
                />
              </div>
            </div>
            <div className="advanced-option">
              <div className="hint">配電級再生能源 台電公司於核發審查意見書後即進行外線設計。(註13)</div>
              <div className="choice-row">
                <div className="choice-group is-binary" role="radiogroup" aria-label="外線設計">
                  {ADVANCED_OPTION_CHOICES.map((option) => (
                    <button
                      type="button"
                      key={option}
                      className={`choice-pill ${form.externalDesign === option ? "is-active" : ""}`}
                      onClick={() => updateField("externalDesign", option)}
                    >
                      <span className="choice-mark" aria-hidden="true">
                        {form.externalDesign === option ? "■" : "□"}
                      </span>
                      {option}
                    </button>
                  ))}
                </div>
                <input
                  aria-label="外線設計勾選日期"
                  type="date"
                  value={form.externalDesignDate}
                  onChange={(event) => updateField("externalDesignDate", event.target.value)}
                />
              </div>
            </div>
            <textarea
              aria-label={ariaLabel}
              rows={5}
              placeholder={placeholder}
              value={form[name]}
              onChange={(event) => updateField(name, event.target.value)}
            />
          </div>
        ) : type === "installationCategory" ? (
          <div className="installation-groups" role="group" aria-label={label}>
            {Object.entries(INSTALLATION_CATEGORY_GROUPS).map(([groupLabel, options]) => (
              <div className="installation-group" key={groupLabel}>
                <div className="installation-group-label">{groupLabel}</div>
                <div className="choice-group installation-choice-group" role="radiogroup" aria-label={`${groupLabel}設置分類`}>
                  {options.map((option) => (
                    <button
                      type="button"
                      key={option}
                      className={`choice-pill ${form.solarCategory === option ? "is-active" : ""}`}
                      onClick={() => {
                        updateField("energyCategory", groupLabel);
                        updateField(name, option);
                      }}
                    >
                      <span className="choice-mark" aria-hidden="true">
                        {form.solarCategory === option ? "■" : "□"}
                      </span>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : optionMap[type] ? (
          <div
            className={`choice-group${type === "saleMode" ? " is-sale-mode" : ""}${type === "parallelMethod" ? " is-binary" : ""}`}
            role="radiogroup"
            aria-label={label}
          >
            {optionMap[type].map((option) => (
              <button
                type="button"
                key={option}
                className={`choice-pill ${form[name] === option ? "is-active" : ""}`}
                onClick={() => updateField(name, option)}
              >
                <span className="choice-mark" aria-hidden="true">{form[name] === option ? "■" : "□"}</span>
                {option}
              </button>
            ))}
          </div>
        ) : type === "textarea" ? (
          <textarea
            aria-label={ariaLabel}
            rows={5}
            placeholder={placeholder}
            value={form[name]}
            onChange={(event) => updateField(name, event.target.value)}
          />
        ) : (
          <input
            aria-label={ariaLabel}
            type={type}
            inputMode={type === "number" ? "decimal" : undefined}
            placeholder={placeholder}
            value={form[name]}
            onChange={(event) => updateField(name, event.target.value)}
          />
        )}
      </div>
    </label>
  );
}

export default function Page() {
  const [form, setForm] = useState(CASE_FORM_DEFAULTS);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm(loadDraft());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form, mounted]);

  const validation = validateCaseForm(form);
  const issues = summarizeIssues(validation);
  const totalFields = sections.reduce((sum, section) => {
    const visibleFields = [...section.fields, ...(section.detailFields ?? [])].filter(([name]) =>
      isFieldVisible(name, form)
    );
    return sum + visibleFields.length;
  }, 0);
  const filledFields = sections.reduce(
    (sum, section) =>
      sum + countFilledFields(form, [...section.fields, ...(section.detailFields ?? [])]),
    0
  );
  const completionRate = Math.round((filledFields / totalFields) * 100);
  const sectionSnapshot = buildSectionSnapshot(form);
  const missingRequired = sections
    .flatMap((section) => [...section.fields, ...(section.detailFields ?? [])].map(([name]) => name))
    .filter((name, index, names) => names.indexOf(name) === index)
    .filter((name) => isFieldVisible(name, form))
    .filter((name) => isFieldRequired(name, form) && !normalize(form[name]));
  const topMissing = missingRequired
    .slice(0, 5)
    .map((name) => sections.flatMap((section) => [...section.fields, ...(section.detailFields ?? [])]).find(([fieldName]) => fieldName === name)?.[1] ?? name);

  function updateField(name, value) {
    setForm((current) => {
      if (name === "energyCategory") {
        const nextOptions = INSTALLATION_CATEGORY_GROUPS[value] ?? [];
        return {
          ...current,
          energyCategory: value,
          solarCategory: nextOptions.includes(current.solarCategory) ? current.solarCategory : (nextOptions[0] ?? "")
        };
      }

      return { ...current, [name]: value };
    });
  }

  function applyCompanyDefaults() {
    setForm((current) => ({
      ...current,
      contactPerson: current.contactPerson || current.companyContactPerson,
      contactPhone: current.contactPhone || current.companyPhone,
      contactAddress: current.contactAddress || current.companyAddress
    }));
    setStatus("已把公司預設資料套用到案件聯絡資訊。");
  }

  function clearDraft() {
    setForm(CASE_FORM_DEFAULTS);
    window.localStorage.removeItem(STORAGE_KEY);
    setStatus("草稿已清空。");
  }

  async function exportDocx() {
    const result = validateCaseForm(form);
    if (!result.success) {
      setStatus(`請先補齊欄位：${summarizeIssues(result).join("、")}`);
      return;
    }

    setBusy(true);
    setStatus("正在產出已填好的官方 Word...");

    try {
      const docxBuffer = await renderDocxBuffer({ ...result.data, exportFormat: "docx" });
      const blob = new Blob([docxBuffer], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "再生能源發電設備併聯審查申請表.docx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatus("官方 Word 已匯出，送審前請自行確認欄位內容，並可自行另存 PDF。");
    } catch (error) {
      console.error(error);
      setStatus("匯出失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="shell">
        <section className="hero">
          <div className="hero-copy">
            <h1>再生能源發電設備併聯審查申請表</h1>
            <p>
              這版直接比照你給的參考頁邏輯做成閱讀型流程。主欄位留在前段，補充欄位往後收，
              讓送審資料可以一路往下填，不用在一大坨表單裡迷路。
            </p>
          </div>
          <div className="hero-ribbon">
            <div className="hero-ribbon-label">114 年 03 月 11 日修正版欄位結構</div>
            <div className="hero-ribbon-value">以台電送審順序整理</div>
          </div>
          <div className="overview">
            {sectionSnapshot.map((item) => (
              <div className="overview-card" key={item.title}>
                <span>{item.title}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <div className="workspace">
          <form className="form-stack">
            {sections.map((section, index) => {
            const detailFields = section.detailFields ?? [];
            const filledCount = countFilledFields(form, [...section.fields, ...detailFields]);
            const totalCount = section.fields.length + detailFields.length;

            return (
              <section className="section" key={section.title}>
                <div className={`section-card ${section.title === "案件補充與申請選項" ? "is-tight" : ""}`}>
                  <div className="section-header">
                    <div>
                      <div className="section-kicker">Step {index + 1}</div>
                      <h2>{section.title}</h2>
                    </div>
                    <div className="section-progress">
                      <span>本段完成度</span>
                      <strong>{filledCount} / {totalCount}</strong>
                    </div>
                  </div>
                  <p className="section-description">{section.description}</p>
                  {section.staticItems?.length ? (
                    <div className="static-grid">
                      {section.staticItems.map(([label, value]) => (
                        <div className="static-card" key={label}>
                          <div className="hint">{label}</div>
                          <div className="value-chip">{value}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className={`grid ${section.fields.some(([, , type]) => type === "textarea") ? "" : "cols-2"}`}>
                    {section.fields.map(([name, label, type]) =>
                      renderField(name, label, type, form, updateField, "core")
                    )}
                  </div>
                  {section.note ? (
                    <div className="section-note">
                      <div className="hint">{section.note}</div>
                    </div>
                  ) : null}
                  {detailFields.length > 0 ? (
                    <details className="detail-shell">
                      <summary>補充欄位 ({countFilledFields(form, detailFields)} / {detailFields.length})</summary>
                      <div className="detail-panel">
                        <div className="hint">這些欄位留給進階案件或台電補件時再填，不先擠進主流程。</div>
                        <div className="grid cols-2">
                          {detailFields.map(([name, label, type]) =>
                            renderField(name, label, type, form, updateField, "detail")
                          )}
                        </div>
                      </div>
                    </details>
                  ) : null}
                </div>
              </section>
            );
          })}
            <section className="section final-check">
              <div className="section-card is-tight">
                <div className="section-header">
                  <div>
                    <div className="section-kicker">Final Check</div>
                    <h2>匯出前檢查</h2>
                  </div>
                  <div className="section-progress">
                    <span>目前狀態</span>
                    <strong>{issues.length === 0 ? "可以匯出" : `還差 ${issues.length} 項`}</strong>
                  </div>
                </div>
                <p className="section-description">最後確認目前草稿缺什麼，避免匯出後還要回頭找欄位。</p>
                <div className="grid cols-2">
                <PreviewItem label="設置者名稱" value={form.ownerName} />
                <PreviewItem label="案件地址" value={form.siteAddress} />
                <PreviewItem label="聯絡人" value={form.contactPerson} />
                <PreviewItem label="預計併聯日期" value={form.estimatedParallelDate} />
                </div>
                <div className="grid cols-2 review-grid">
                  <div className="review-card">
                    <div className="hint">填寫提醒</div>
                    <ul className="footer-note">
                      <li>申請日期可先留白，最後再補。</li>
                      <li>主流程先填核心欄位，補充欄位有需要再展開。</li>
                      <li>若看到舊資料，先按一次清空草稿再重填。</li>
                    </ul>
                  </div>
                  <div className="review-card">
                    <div className="hint">匯出前檢查</div>
                    {issues.length === 0 ? (
                      <p className="footer-note">可以匯出。下載 Word 後再確認一次內容，必要時自行另存 PDF。</p>
                    ) : (
                      <ul className="footer-note">
                        {issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </form>

          <aside className="sidebar">
            <section className="sidebar-card summary-card">
              <div className="sidebar-kicker">案件摘要</div>
              <h3>先填主要欄位，再匯出官方 Word</h3>
              <div className="summary-grid">
                <div className="summary-row">
                  <span>完成度</span>
                  <strong>{filledFields} / {totalFields} ({completionRate}%)</strong>
                </div>
                <div className="summary-row">
                  <span>必填未完成</span>
                  <strong>{missingRequired.length} 項</strong>
                </div>
                <div className="summary-row">
                  <span>可匯出格式</span>
                  <strong>官方 Word</strong>
                </div>
              </div>
              <div className="status" role="status">{status || "填寫中，草稿會自動留在這台裝置。"}</div>
            </section>

            <section className="sidebar-card action-card">
              <div className="sidebar-kicker">操作列</div>
              <div className="actions">
                <button className="primary" type="button" onClick={exportDocx} disabled={busy}>
                  {busy ? "匯出中..." : "匯出官方 Word"}
                </button>
                <button className="secondary" type="button" onClick={applyCompanyDefaults}>
                  套用公司資料
                </button>
                <button className="danger" type="button" onClick={clearDraft}>
                  清空草稿
                </button>
              </div>
            </section>

            <section className="sidebar-card issue-card">
              <div className="sidebar-kicker">目前缺口</div>
              {topMissing.length > 0 ? (
                <ul className="issue-list">
                  {topMissing.map((label, index) => (
                    <li key={`${label}-${index}`}>{label}</li>
                  ))}
                </ul>
              ) : (
                <p className="footer-note">主要欄位都填得差不多了，可以直接匯出確認版面。</p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
