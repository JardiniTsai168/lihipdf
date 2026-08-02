import { CASE_FORM_DEFAULTS } from "./schema";

export const STORAGE_KEY = "lihipdf_app_draft_v1";

export const SALE_MODE_OPTIONS = [
  "僅併聯不躉售",
  "全額躉售",
  "自發自用(餘電躉售)",
  "直供餘電躉售(限第一型)",
  "轉供餘電躉售",
  "轉供自用(第二、三型)"
];

export const PARALLEL_METHOD_OPTIONS = ["台電外線", "用戶內線"];

export const DOCUMENT_OPTIONS = [
  {
    id: "parallelReview",
    title: "併聯審查申請表",
    description: "第一份正式送審文件，現在已可匯出 Word。"
  },
  {
    id: "parallelAgreement",
    title: "併聯協議書",
    description: "先保留文件入口，等下一階段接 mapper。"
  },
  {
    id: "taipowerRegistrationCandidate",
    title: "台電登記單",
    description: "第三份候選文件先占位，後面再確認正式模板。"
  }
];

export const DEFAULT_DOCUMENT_SELECTIONS = {
  parallelReview: true,
  parallelAgreement: false,
  taipowerRegistrationCandidate: false
};

export function createAppDraftDefaults() {
  return {
    ...CASE_FORM_DEFAULTS,
    selectedDocuments: { ...DEFAULT_DOCUMENT_SELECTIONS }
  };
}

export const CASE_SECTIONS = [
  {
    title: "案件與設置者資料",
    description: "",
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
      ["applicationDate", "申請日期", "date"],
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
  }
];

export const FIELD_HINTS = {
  applicationDate: "例：2026-08-01",
  ownerName: "例：王小明",
  principalName: "例：王大明",
  ownerPhone: "例：0912-345-678",
  ownerAddress: "例：高雄市鼓子區無尾熊路49號",
  siteAddress: "例：高雄市鼓子區無尾熊路49號",
  contactPerson: "例：陳先生",
  contactPhone: "例：07-7338588",
  contactAddress: "例：高雄市鼓子區無尾熊路49號",
  caseNumber: "",
  districtOffice: "例：高雄區處",
  electricNumber: "例：12-34-5678-90-1",
  installedExisting: "",
  installedNew: "例：9",
  installedTotal: "例：9",
  saleExisting: "",
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
  otherNotes: ""
};

export const FIELD_ARIA_LABELS = {
  siteAddress: "設置場所或地點",
  contactAddress: "連絡人通訊處",
  contactPhone: "連絡人電話",
  installedNew: "裝置容量_新增設_瓩",
  installedTotal: "裝置容量_合計_瓩",
  saleNew: "躉售容量_新增設_瓩",
  saleTotal: "躉售容量_合計_瓩",
  contractCapacity: "契約容量_瓩"
};
