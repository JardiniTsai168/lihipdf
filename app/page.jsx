"use client";

import React from "react";
import { useEffect, useState } from "react";

import {
  ADVANCED_OPTION_CHOICES,
  DEVICE_TYPE_OPTIONS,
  ENERGY_CATEGORY_OPTIONS,
  INSTALLATION_CATEGORY_GROUPS,
  validateCaseForm
} from "./lib/schema";
import {
  CASE_SECTIONS,
  createAppDraftDefaults,
  DOCUMENT_OPTIONS,
  FIELD_ARIA_LABELS,
  FIELD_HINTS,
  PARALLEL_METHOD_OPTIONS,
  SALE_MODE_OPTIONS,
  STORAGE_KEY
} from "./lib/form-config";
import { DOCUMENT_REGISTRY, getReadyDocumentIds, getSelectedDocumentIds } from "./lib/documents";
import { exportDocument } from "./lib/export-pipeline";

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

function PreviewItem({ label, value }) {
  return (
    <div className="preview-item">
      <span>{label}</span>
      <strong>{value || "未填"}</strong>
    </div>
  );
}

function normalize(value) {
  return String(value ?? "").trim();
}

function loadDraft() {
  const fallback = createAppDraftDefaults();
  if (typeof window === "undefined") return fallback;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    return {
      ...fallback,
      ...parsed,
      selectedDocuments: {
        ...fallback.selectedDocuments,
        ...(parsed.selectedDocuments ?? {})
      }
    };
  } catch {
    return fallback;
  }
}

function persistDraft(form) {
  const { selectedDocuments, ...caseData } = form;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...caseData,
      selectedDocuments
    })
  );
}

function summarizeIssues(result) {
  if (result.success) return [];
  return [...new Set(result.error.issues.map((issue) => issue.message))];
}

function isFieldRequired(name, formData) {
  if (BASE_REQUIRED_FIELDS.has(name)) return true;
  if ((name === "saleNew" || name === "saleTotal") && formData.saleMode !== "僅併聯不躉售") return true;
  if (name === "innerLineNumber" && formData.parallelMethod === "用戶內線") return true;
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

function buildOverviewCards(formData, attachments) {
  return [
    {
      title: "固定設備型別",
      value: "第三型 / 太陽光電"
    },
    {
      title: "文件選擇",
      value:
        getSelectedDocumentIds(formData.selectedDocuments)
          .map((id) => DOCUMENT_REGISTRY[id]?.shortTitle)
          .filter(Boolean)
          .join(" / ") || "先勾這次要輸出的文件"
    },
    {
      title: "附件狀態",
      value: attachments.length > 0 ? `已加入 ${attachments.length} 份附件` : "附件骨架已就位"
    }
  ];
}

function buildSelectedDocumentSummary(selectedDocuments) {
  const selectedIds = getSelectedDocumentIds(selectedDocuments);
  if (selectedIds.length === 0) return "尚未選擇";
  return selectedIds
    .map((id) => DOCUMENT_REGISTRY[id]?.shortTitle)
    .filter(Boolean)
    .join("、");
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
    parallelMethod: PARALLEL_METHOD_OPTIONS,
    saleMode: SALE_MODE_OPTIONS
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
        ) : type === "number" ? (
          <div className="input-with-unit">
            <input
              aria-label={ariaLabel}
              type="number"
              inputMode="decimal"
              placeholder={placeholder}
              value={form[name]}
              onChange={(event) => updateField(name, event.target.value)}
            />
            <span className="input-unit" aria-hidden="true">瓩</span>
          </div>
        ) : (
          <input
            aria-label={ariaLabel}
            type={type}
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
  const [form, setForm] = useState(createAppDraftDefaults());
  const [attachments, setAttachments] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm(loadDraft());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    persistDraft(form);
  }, [form, mounted]);

  useEffect(() => {
    return () => {
      attachments.forEach((attachment) => {
        if (attachment.previewUrl) {
          window.URL.revokeObjectURL(attachment.previewUrl);
        }
      });
    };
  }, [attachments]);

  const validation = validateCaseForm(form);
  const issues = summarizeIssues(validation);
  const totalFields = CASE_SECTIONS.reduce((sum, section) => {
    const visibleFields = [...section.fields, ...(section.detailFields ?? [])].filter(([name]) =>
      isFieldVisible(name, form)
    );
    return sum + visibleFields.length;
  }, 0);
  const filledFields = CASE_SECTIONS.reduce(
    (sum, section) => sum + countFilledFields(form, [...section.fields, ...(section.detailFields ?? [])]),
    0
  );
  const completionRate = Math.round((filledFields / totalFields) * 100);
  const overviewCards = buildOverviewCards(form, attachments);
  const missingRequired = CASE_SECTIONS
    .flatMap((section) => [...section.fields, ...(section.detailFields ?? [])].map(([name]) => name))
    .filter((name, index, names) => names.indexOf(name) === index)
    .filter((name) => isFieldVisible(name, form))
    .filter((name) => isFieldRequired(name, form) && !normalize(form[name]));
  const topMissing = missingRequired
    .slice(0, 5)
    .map((name) => CASE_SECTIONS.flatMap((section) => [...section.fields, ...(section.detailFields ?? [])]).find(([fieldName]) => fieldName === name)?.[1] ?? name);
  const selectedDocumentIds = getSelectedDocumentIds(form.selectedDocuments);
  const readyDocumentIds = getReadyDocumentIds(form.selectedDocuments);
  const primaryDocumentId = readyDocumentIds[0] ?? "parallelReview";
  const primaryDocument = DOCUMENT_REGISTRY[primaryDocumentId];

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

  function updateDocumentSelection(documentId, enabled) {
    setForm((current) => ({
      ...current,
      selectedDocuments: {
        ...current.selectedDocuments,
        [documentId]: enabled
      }
    }));
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
    attachments.forEach((attachment) => {
      if (attachment.previewUrl) window.URL.revokeObjectURL(attachment.previewUrl);
    });
    setAttachments([]);
    setForm(createAppDraftDefaults());
    window.localStorage.removeItem(STORAGE_KEY);
    setStatus("草稿已清空。");
  }

  function addAttachments(event) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setAttachments((current) => [
      ...current,
      ...files.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        previewUrl: file.type.startsWith("image/") ? window.URL.createObjectURL(file) : ""
      }))
    ]);
    event.target.value = "";
    setStatus("附件已加入，之後可直接接到匯出流程。");
  }

  function removeAttachment(attachmentId) {
    setAttachments((current) => {
      const target = current.find((attachment) => attachment.id === attachmentId);
      if (target?.previewUrl) window.URL.revokeObjectURL(target.previewUrl);
      return current.filter((attachment) => attachment.id !== attachmentId);
    });
  }

  function moveAttachment(attachmentId, direction) {
    setAttachments((current) => {
      const index = current.findIndex((attachment) => attachment.id === attachmentId);
      if (index < 0) return current;

      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.length) return current;

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  async function exportPrimaryDocument() {
    const result = validateCaseForm(form);
    if (!result.success) {
      setStatus(`請先補齊欄位：${summarizeIssues(result).join("、")}`);
      return;
    }

    if (!primaryDocument) {
      setStatus("請先勾選至少一份可匯出的文件。");
      return;
    }

    setBusy(true);
    setStatus(`正在產出 ${primaryDocument.shortTitle}...`);

    try {
      const exported = await exportDocument({
        documentId: primaryDocument.id,
        format: "docx",
        formData: result.data
      });
      const blob = new Blob([exported.buffer], { type: exported.contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = exported.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatus(`已匯出 ${primaryDocument.shortTitle}。附件串接點已預留，下一步可直接接多文件合併。`);
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
            <h1>lihiPDF 文件框架版</h1>
            <p>
              先把共用案件資料、文件選擇、附件骨架與匯出管線整理好。第一份表單已接進這個框架，
              後面第二份第三份就只要補 mapper，不用再拆整個 app。
            </p>
          </div>
          <div className="hero-ribbon">
            <div className="hero-ribbon-label">Framework First</div>
            <div className="hero-ribbon-value">Form 1 已掛上 registry / pipeline</div>
          </div>
          <div className="overview">
            {overviewCards.map((item) => (
              <div className="overview-card" key={item.title}>
                <span>{item.title}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <div className="workspace">
          <form className="form-stack">
            <section className="section">
              <div className="section-card">
                <div className="section-header">
                  <div>
                    <div className="section-kicker">Framework</div>
                    <h2>文件選擇與附件骨架</h2>
                  </div>
                  <div className="section-progress">
                    <span>目前選擇</span>
                    <strong>{selectedDocumentIds.length} 份文件</strong>
                  </div>
                </div>
                <p className="section-description">先決定這次案件要準備哪些文件，附件也在這裡先排好，後面直接接合併輸出。</p>
                <div className="document-grid">
                  {DOCUMENT_OPTIONS.map((documentOption) => {
                    const definition = DOCUMENT_REGISTRY[documentOption.id];
                    const isChecked = Boolean(form.selectedDocuments[documentOption.id]);
                    return (
                      <label className={`document-card ${isChecked ? "is-selected" : ""}`} key={documentOption.id}>
                        <div className="document-card-head">
                          <input
                            aria-label={documentOption.title}
                            type="checkbox"
                            checked={isChecked}
                            onChange={(event) => updateDocumentSelection(documentOption.id, event.target.checked)}
                          />
                          <div>
                            <strong>{documentOption.title}</strong>
                            <span>{definition?.status === "ready" ? "已接上匯出" : "框架保留中"}</span>
                          </div>
                        </div>
                        <p>{documentOption.description}</p>
                      </label>
                    );
                  })}
                </div>

                <div className="attachment-panel">
                  <div className="attachment-panel-head">
                    <div>
                      <div className="hint">附件系統</div>
                      <h3>圖片與補件附件</h3>
                    </div>
                    <label className="secondary upload-button">
                      加入附件
                      <input aria-label="加入附件" type="file" multiple onChange={addAttachments} />
                    </label>
                  </div>
                  {attachments.length === 0 ? (
                    <p className="footer-note">目前還沒有附件。骨架已完成，已可先測新增、刪除、排序流程。</p>
                  ) : (
                    <div className="attachment-list">
                      {attachments.map((attachment, index) => (
                        <div className="attachment-card" key={attachment.id}>
                          <div className="attachment-meta">
                            <strong>{attachment.fileName}</strong>
                            <span>{attachment.mimeType || "未知格式"} / {Math.ceil(attachment.size / 1024)} KB</span>
                          </div>
                          <div className="attachment-actions">
                            <button type="button" className="secondary" onClick={() => moveAttachment(attachment.id, "up")} disabled={index === 0}>
                              上移
                            </button>
                            <button type="button" className="secondary" onClick={() => moveAttachment(attachment.id, "down")} disabled={index === attachments.length - 1}>
                              下移
                            </button>
                            <button type="button" className="danger" onClick={() => removeAttachment(attachment.id)}>
                              刪除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {CASE_SECTIONS.map((section, index) => {
              const detailFields = section.detailFields ?? [];
              const filledCount = countFilledFields(form, [...section.fields, ...detailFields]);
              const totalCount = [...section.fields, ...detailFields].filter(([name]) => isFieldVisible(name, form)).length;

              return (
                <section className="section" key={section.title}>
                  <div className="section-card">
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
                    <div className={`grid ${section.fields.some(([, , type]) => type === "textarea") ? "" : "cols-2"}`}>
                      {section.fields.map(([name, label, type]) => renderField(name, label, type, form, updateField, "core"))}
                    </div>
                    {detailFields.length > 0 ? (
                      <details className="detail-shell">
                        <summary>補充欄位 ({countFilledFields(form, detailFields)} / {detailFields.length})</summary>
                        <div className="detail-panel">
                          <div className="hint">這些欄位留給進階案件或台電補件時再填，不先擠進主流程。</div>
                          <div className="grid cols-2">
                            {detailFields.map(([name, label, type]) => renderField(name, label, type, form, updateField, "detail"))}
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
                <p className="section-description">這裡看的不是只有第一份文件，而是整個案件框架目前的完整度。</p>
                <div className="grid cols-2">
                  <PreviewItem label="這次文件" value={buildSelectedDocumentSummary(form.selectedDocuments)} />
                  <PreviewItem label="設置者名稱" value={form.ownerName} />
                  <PreviewItem label="案件地址" value={form.siteAddress} />
                  <PreviewItem label="附件數量" value={attachments.length ? `${attachments.length} 份` : ""} />
                </div>
                <div className="grid cols-2 review-grid">
                  <div className="review-card">
                    <div className="hint">框架現況</div>
                    <ul className="footer-note">
                      <li>Form 1 已接上 document registry 與 export pipeline。</li>
                      <li>附件已可新增、刪除、排序，下一步只差掛到合併輸出。</li>
                      <li>第二份第三份文件現在只差各自的 mapper 與模板處理。</li>
                    </ul>
                  </div>
                  <div className="review-card">
                    <div className="hint">匯出前檢查</div>
                    {issues.length === 0 ? (
                      <p className="footer-note">可以直接匯出第一份正式 Word，其他文件已在框架中預留位置。</p>
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
              <h3>先把框架補齊，再接多文件輸出</h3>
              <div className="summary-grid">
                <div className="summary-row">
                  <span>完成度</span>
                  <strong>{filledFields} / {totalFields} ({completionRate}%)</strong>
                </div>
                <div className="summary-row">
                  <span>已選文件</span>
                  <strong>{selectedDocumentIds.length} 份</strong>
                </div>
                <div className="summary-row">
                  <span>附件狀態</span>
                  <strong>{attachments.length} 份</strong>
                </div>
              </div>
              <div className="status" role="status">{status || "框架版已啟用，草稿會自動留在這台裝置。"}</div>
            </section>

            <section className="sidebar-card action-card">
              <div className="sidebar-kicker">操作列</div>
              <div className="actions">
                <button className="primary" type="button" onClick={exportPrimaryDocument} disabled={busy || !primaryDocument}>
                  {busy ? "匯出中..." : primaryDocument?.exportLabel || "請先選文件"}
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
