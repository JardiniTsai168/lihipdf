"use client";

import React from "react";
import { useEffect, useState } from "react";

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

function PreviewItem({ label, value }) {
  return (
    <div className="preview-item">
      <span>{label}</span>
      <strong>{value || "未填"}</strong>
    </div>
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
      const response = await fetch("/api/export/official-docx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ...result.data, exportFormat: "docx" })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
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
        <h1>lihiPDF 單一表單 MVP</h1>
        <p className="hero-text">
          先做第一份太陽能送審表單。輸入一次案件資料，直接產出已填好的官方 Word，先求可用 MVP。
        </p>
        <div className="action-row">
          <button type="button" className="primary" onClick={exportDocx} disabled={busy}>
            {busy ? "匯出中..." : "匯出官方 Word"}
          </button>
          <button type="button" className="secondary" onClick={applyCompanyDefaults}>
            套用公司預設到聯絡資訊
          </button>
          <button type="button" className="ghost" onClick={clearDraft}>
            清空草稿
          </button>
        </div>
        <p className="status-line" role="status">
          {status}
        </p>
      </section>

      <div className="layout-grid">
        <form className="form-stack">
          {sections.map((section) => (
            <section className="panel" key={section.title}>
              <div className="panel-head">
                <h2>{section.title}</h2>
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
                        rows={4}
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
          ))}
        </form>

        <aside className="panel preview-panel">
          <div className="panel-head">
            <h2>預覽摘要</h2>
            <p>匯出前先看一次案件重點，正式送審前仍請自行確認欄位內容。</p>
          </div>
          <div className="preview-list">
            <PreviewItem label="文件" value={form.documentTitle} />
            <PreviewItem label="設置者名稱" value={form.ownerName} />
            <PreviewItem label="設置場所或地點" value={form.siteAddress} />
            <PreviewItem label="連絡人" value={form.contactPerson} />
            <PreviewItem label="裝置容量_新增設_瓩" value={form.installedNew} />
            <PreviewItem label="預計併聯日期" value={form.estimatedParallelDate} />
          </div>

          <div className="validation-card">
            <h3>匯出前檢查</h3>
            {issues.length === 0 ? (
              <p className="valid">可匯出。送審前請再確認欄位內容，並自行另存 PDF。</p>
            ) : (
              <ul>
                {issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
