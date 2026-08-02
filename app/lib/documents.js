export const DOCUMENT_REGISTRY = {
  parallelReview: {
    id: "parallelReview",
    title: "再生能源發電設備併聯審查申請表",
    shortTitle: "併聯審查申請表",
    status: "ready",
    formats: ["docx"],
    exportLabel: "匯出官方 Word",
    fileName: "再生能源發電設備併聯審查申請表.docx"
  },
  parallelAgreement: {
    id: "parallelAgreement",
    title: "再生能源發電系統併聯協議書",
    shortTitle: "併聯協議書",
    status: "planned",
    formats: [],
    exportLabel: "尚未開放",
    fileName: ""
  },
  taipowerRegistrationCandidate: {
    id: "taipowerRegistrationCandidate",
    title: "台電登記單候選文件",
    shortTitle: "台電登記單",
    status: "planned",
    formats: [],
    exportLabel: "尚未開放",
    fileName: ""
  }
};

export function getSelectedDocumentIds(selectedDocuments = {}) {
  return Object.entries(selectedDocuments)
    .filter(([, enabled]) => enabled)
    .map(([id]) => id);
}

export function getReadyDocumentIds(selectedDocuments = {}) {
  return getSelectedDocumentIds(selectedDocuments).filter(
    (id) => DOCUMENT_REGISTRY[id]?.status === "ready"
  );
}
