"use client";

import React from "react";
import { useEffect, useState } from "react";
import PizZip from "pizzip";

import { CASE_FORM_DEFAULTS, validateCaseForm } from "./lib/schema";

const STORAGE_KEY = "lihipdf_single_form_v1";

const sections = [
  {
    title: "基本資料",
    description: "先收案件身分、窗口與場址資訊。",
    fields: [
      ["applicationDate", "申請日期", "date"],
      ["ownerName", "設置者名稱", "text"],
      ["principalName", "負責人", "text"],
      ["ownerPhone", "連絡電話", "tel"],
      ["ownerAddress", "通訊處", "text"],
      ["siteAddress", "設置場所或地點", "text"],
      ["contactPerson", "連絡人", "text"],
      ["contactPhone", "連絡人電話", "tel"],
      ["contactAddress", "連絡人通訊處", "text"]
    ]
  },
  {
    title: "設備型別與能源類別",
    description: "固定條件直接鎖住，只留下太陽光電的必要選項。",
    note: "這版先專心處理太陽光電，其他能源與特殊分支先不混進來。",
    staticItems: [
      ["再生能源發電設備型別", "第三型"],
      ["再生能源類別", "太陽光電"]
    ],
    fields: [
      ["solarCategory", "設置分類", "solarCategory"]
    ]
  },
  {
    title: "容量資料",
    description: "容量欄位照台電表單分開放，避免新增設和合計填錯位置。",
    fields: [
      ["installedNew", "裝置容量_新增設_瓩", "number"],
      ["installedTotal", "裝置容量_合計_瓩", "number"],
      ["saleNew", "躉售容量_新增設_瓩", "number"],
      ["saleTotal", "躉售容量_合計_瓩", "number"],
    ],
    detailFields: [
      ["installedExisting", "裝置容量_既設_瓩", "number"],
      ["saleExisting", "躉售容量_既設_瓩", "number"]
    ]
  },
  {
    title: "併聯與售電方式",
    description: "先決定併聯路徑和售電模式，後面匯出的文件才不會走錯分支。",
    fields: [
      ["contractType", "預計併聯方式 / 契約別", "text"],
      ["contractCapacity", "售電方式 / 契約容量", "text"],
      ["innerLineNumber", "內線號碼", "text"]
    ]
  },
  {
    title: "電壓與時程",
    description: "這三格是最常回頭修改的欄位，集中放在一起比較好找。",
    fields: [
      ["boundaryVoltage", "責任分界點電壓", "text"],
      ["parallelPointVoltage", "併聯點電壓", "text"],
      ["estimatedParallelDate", "預計併聯日期", "date"]
    ]
  },
  {
    title: "案件補充與申請選項",
    description: "有特殊說明再填，留白也沒問題。Word 匯出時仍會自動補預設句型。",
    fields: [
      ["otherNotes", "其他事項", "textarea"]
    ],
    detailFields: [
      ["caseNumber", "編號", "text"],
      ["districtOffice", "區處", "text"],
      ["electricNumber", "電號", "text"],
      ["relatedCaseNumber", "相關案件編號", "text"]
    ]
  },
  {
    title: "公司預設資料",
    description: "先填常用資料，案件聯絡資訊可直接沿用。",
    fields: [
      ["companyName", "公司名稱", "text"],
      ["companyContactPerson", "公司聯絡人", "text"],
      ["companyPhone", "公司電話", "tel"],
      ["companyAddress", "公司地址", "text"],
      ["companyTaxId", "公司統編", "text"]
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
  innerLineNumber: "若走內線再填",
  contractType: "例：併聯台電外線 / 低壓併聯",
  contractCapacity: "例：全額躉售 / 49.5kW",
  estimatedParallelDate: "例：2026-12-31",
  relatedCaseNumber: "若有前案再填",
  companyName: "例：某某能源股份有限公司",
  companyContactPerson: "例：鄒侑廷",
  companyPhone: "例：0939-255-192",
  companyAddress: "例：高雄市前鎮區成功路88號",
  companyTaxId: "例：12345678",
  otherNotes: "留白也可以，匯出時會保留預設句型"
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

function buildDocumentPayload(formData) {
  const normalizedOtherNotes = normalize(formData.otherNotes).replace(/\r/g, "\n");

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
    innerLineNumber: normalize(formData.innerLineNumber),
    contractType: normalize(formData.contractType),
    contractCapacity: normalize(formData.contractCapacity),
    boundaryVoltage: normalize(formData.boundaryVoltage),
    parallelPointVoltage: normalize(formData.parallelPointVoltage),
    estimatedParallelDateRoc: rocDateString(formData.estimatedParallelDate),
    relatedCaseNumber: normalize(formData.relatedCaseNumber),
    otherNotes: normalizedOtherNotes,
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

async function renderDocxBuffer(formData) {
  const baseUrl = window.location.href.endsWith("/") ? window.location.href : `${window.location.href}/`;
  const templateUrl = new URL("./official-template-fillable.docx", baseUrl);
  const templateBytes = await fetch(templateUrl).then((response) => response.arrayBuffer());
  const zip = new PizZip(templateBytes);
  let documentXml = zip.file("word/document.xml").asText();
  const payload = buildDocumentPayload(formData);

  documentXml = applyTemplateLayoutFixes(documentXml);

  for (const [key, value] of Object.entries(payload)) {
    documentXml = documentXml.replaceAll(`{{${key}}}`, xmlValue(value));
  }

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

const REQUIRED_FIELDS = new Set([
  "ownerName",
  "ownerPhone",
  "ownerAddress",
  "siteAddress",
  "contactPerson",
  "contactPhone",
  "contactAddress",
  "installedNew",
  "installedTotal",
  "saleNew",
  "saleTotal",
  "boundaryVoltage",
  "parallelPointVoltage",
  "estimatedParallelDate"
]);

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
    return normalize(formData[name]) ? total + 1 : total;
  }, 0);
}

function fieldState(name, value) {
  if (!REQUIRED_FIELDS.has(name)) return normalize(value) ? "filled" : "optional";
  return normalize(value) ? "filled" : "missing";
}

function renderField(name, label, type, form, updateField, variant = "core") {
  const placeholder = FIELD_HINTS[name];
  const hint = FIELD_HINTS[name];
  const badgeLabel = variant === "detail" ? "補充" : "主要";
  const state = fieldState(name, form[name]);
  const isRequired = REQUIRED_FIELDS.has(name);

  return (
    <label className={`field ${type === "textarea" ? "field-wide" : ""} is-${state}`} key={name}>
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
        {type === "solarCategory" ? (
          <div className="choice-group" role="radiogroup" aria-label={label}>
            {["屋頂", "地面", "水面"].map((option) => (
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
            aria-label={label}
            rows={5}
            placeholder={placeholder}
            value={form[name]}
            onChange={(event) => updateField(name, event.target.value)}
          />
        ) : (
          <input
            aria-label={label}
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
  const totalFields = sections.reduce(
    (sum, section) => sum + section.fields.length + (section.detailFields?.length ?? 0),
    0
  );
  const filledFields = sections.reduce(
    (sum, section) =>
      sum + countFilledFields(form, [...section.fields, ...(section.detailFields ?? [])]),
    0
  );
  const completionRate = Math.round((filledFields / totalFields) * 100);
  const sectionSnapshot = buildSectionSnapshot(form);
  const missingRequired = [...REQUIRED_FIELDS].filter((name) => !normalize(form[name]));
  const topMissing = missingRequired
    .slice(0, 5)
    .map((name) => sections.flatMap((section) => [...section.fields, ...(section.detailFields ?? [])]).find(([fieldName]) => fieldName === name)?.[1] ?? name);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
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
            <div className="eyebrow">Solar Parallel Review Workflow</div>
            <h1>把併聯審查表單，整理成真的看得懂的工作頁</h1>
            <div className="document-note">再生能源發電設備併聯審查申請表</div>
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
                <div className="section-index">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
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
              <div className="section-index">
                <span>08</span>
              </div>
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
                  {topMissing.map((label) => (
                    <li key={label}>{label}</li>
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
