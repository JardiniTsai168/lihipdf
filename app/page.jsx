"use client";

import React from "react";
import { useEffect, useState } from "react";
import PizZip from "pizzip";

import { CASE_FORM_DEFAULTS, validateCaseForm } from "./lib/schema";

const STORAGE_KEY = "lihipdf_single_form_v1";

const sections = [
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
  },
  {
    title: "案件資料",
    description: "直接開始做案件，不先卡設定。",
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
    title: "容量與時程",
    description: "只保留第一份表單真正要填進文件的核心欄位。",
    fields: [
      ["solarCategory", "設置分類", "select"],
      ["installedNew", "裝置容量_新增設_瓩", "number"],
      ["installedTotal", "裝置容量_合計_瓩", "number"],
      ["saleNew", "躉售容量_新增設_瓩", "number"],
      ["saleTotal", "躉售容量_合計_瓩", "number"],
      ["boundaryVoltage", "責任分界點電壓", "text"],
      ["parallelPointVoltage", "併聯點電壓", "text"],
      ["estimatedParallelDate", "預計併聯日期", "date"],
      ["otherNotes", "其他事項", "textarea"]
    ]
  }
];

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

function buildSectionSnapshot(formData) {
  return [
    {
      title: "公司預設",
      value: normalize(formData.companyName) || "先填公司資料"
    },
    {
      title: "案件主體",
      value: normalize(formData.ownerName) || "先填設置者名稱"
    },
    {
      title: "案件地點",
      value: normalize(formData.siteAddress) || "先填設置場所或地點"
    },
    {
      title: "容量重點",
      value: normalize(formData.installedNew) ? `${formData.installedNew} kW` : "先填新增設容量"
    }
  ];
}

function countFilledFields(formData, fields) {
  return fields.reduce((total, [name]) => {
    return normalize(formData[name]) ? total + 1 : total;
  }, 0);
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
  const totalFields = sections.reduce((sum, section) => sum + section.fields.length, 0);
  const filledFields = sections.reduce(
    (sum, section) => sum + countFilledFields(form, section.fields),
    0
  );
  const completionRate = Math.round((filledFields / totalFields) * 100);
  const sectionSnapshot = buildSectionSnapshot(form);

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
      <section className="hero-card">
        <p className="eyebrow">Solar MVP</p>
        <h1>一頁填完，直接匯出官方 Word</h1>
        <p className="hero-text">
          先把第一份太陽能送審表單做順。照著 3 步填，最後下載已填好的官方 Word。
        </p>
        <div className="hero-meta">
          <div className="progress-card">
            <span>完成度</span>
            <strong>{filledFields} / {totalFields}</strong>
            <em>{completionRate}%</em>
          </div>
          <div className="progress-card">
            <span>目前狀態</span>
            <strong>{issues.length === 0 ? "可以匯出" : `還差 ${issues.length} 項`}</strong>
            <em>{issues.length === 0 ? "欄位已補齊" : "先把缺漏補完"}</em>
          </div>
        </div>
        <div className="action-row hero-actions">
          <button type="button" className="primary" onClick={exportDocx} disabled={busy}>
            {busy ? "匯出中..." : "匯出官方 Word"}
          </button>
          <button type="button" className="secondary" onClick={applyCompanyDefaults}>
            套用公司資料到聯絡人
          </button>
          <button type="button" className="ghost" onClick={clearDraft}>
            清空草稿
          </button>
        </div>
        <p className="status-line" role="status">
          {status}
        </p>
      </section>

      <div className="workspace-grid">
        <form className="form-stack">
          {sections.map((section, index) => {
            const filledCount = countFilledFields(form, section.fields);
            const totalCount = section.fields.length;

            return (
              <section className="panel" key={section.title}>
                <div className="panel-head">
                  <div className="section-title-row">
                    <div>
                      <p className="section-step">STEP {index + 1}</p>
                      <h2>{section.title}</h2>
                    </div>
                    <div className="section-meter">
                      <strong>{filledCount} / {totalCount}</strong>
                      <span>已填欄位</span>
                    </div>
                  </div>
                  <p>{section.description}</p>
                </div>
                <div className="fields-grid">
                  {section.fields.map(([name, label, type]) => (
                    <label className={`field ${type === "textarea" ? "field-wide" : ""}`} key={name}>
                      <span>{label}</span>
                      {type === "select" ? (
                        <select
                          aria-label={label}
                          value={form[name]}
                          onChange={(event) => updateField(name, event.target.value)}
                        >
                          <option value="屋頂">屋頂</option>
                          <option value="地面">地面</option>
                          <option value="水面">水面</option>
                        </select>
                      ) : type === "textarea" ? (
                        <textarea
                          aria-label={label}
                          rows={5}
                          value={form[name]}
                          onChange={(event) => updateField(name, event.target.value)}
                        />
                      ) : (
                        <input
                          aria-label={label}
                          type={type}
                          inputMode={type === "number" ? "decimal" : undefined}
                          value={form[name]}
                          onChange={(event) => updateField(name, event.target.value)}
                        />
                      )}
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </form>

        <aside className="sidebar-stack">
          <section className="panel quick-panel sidebar-panel">
            <div className="panel-head">
              <h2>先看這裡</h2>
              <p>左邊照著填，右邊隨時看摘要。先把缺漏補完，再按匯出就好。</p>
            </div>
            <div className="snapshot-grid">
              {sectionSnapshot.map((item) => (
                <div className="snapshot-card" key={item.title}>
                  <span>{item.title}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
            <div className="quick-grid">
              <PreviewItem label="設置者名稱" value={form.ownerName} />
              <PreviewItem label="案件地址" value={form.siteAddress} />
              <PreviewItem label="聯絡人" value={form.contactPerson} />
              <PreviewItem label="預計併聯日期" value={form.estimatedParallelDate} />
            </div>

            <div className="validation-card inline-validation">
              <h3>匯出前檢查</h3>
              {issues.length === 0 ? (
                <p className="valid">可以匯出。下載 Word 後再確認一次內容，必要時自行另存 PDF。</p>
              ) : (
                <ul>
                  {issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
