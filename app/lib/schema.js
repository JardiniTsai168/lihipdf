import { z } from "zod";

export const DEFAULT_OTHER_NOTES = "";
export const DEVICE_TYPE_OPTIONS = ["第一型", "第二型", "第三型"];
export const ENERGY_CATEGORY_OPTIONS = [
  "太陽光電",
  "小水力",
  "生質能",
  "風力",
  "地熱能",
  "廢棄物",
  "氫能",
  "燃料電池",
  "海洋能"
];
export const INSTALLATION_CATEGORY_GROUPS = {
  太陽光電: ["屋頂", "地面", "水面"],
  風力: ["陸域", "離岸"],
  生質能: ["無", "有厭氧消化設備", "農林植物"],
  廢棄物: ["一般", "農業"]
};
export const INSTALLATION_CATEGORY_OPTIONS = Object.values(INSTALLATION_CATEGORY_GROUPS).flat();
export const ADVANCED_OPTION_CHOICES = ["需", "不需"];

export const CASE_FORM_DEFAULTS = {
  documentTitle: "再生能源發電設備併聯審查申請表",
  exportFormat: "pdf",
  companyName: "",
  companyContactPerson: "",
  companyPhone: "",
  companyAddress: "",
  companyTaxId: "",
  caseNumber: "",
  districtOffice: "",
  applicationDate: "",
  ownerName: "",
  principalName: "",
  electricNumber: "",
  ownerPhone: "",
  ownerAddress: "",
  siteAddress: "",
  contactPerson: "",
  contactPhone: "",
  contactAddress: "",
  deviceType: "第三型",
  energyCategory: "太陽光電",
  solarCategory: "屋頂",
  installedExisting: "",
  installedNew: "",
  installedTotal: "",
  saleExisting: "",
  saleNew: "",
  saleTotal: "",
  parallelMethod: "台電外線",
  innerLineNumber: "",
  contractType: "",
  contractCapacity: "",
  saleMode: "全額躉售",
  boundaryVoltage: "單 相 3 線 110/220 伏",
  parallelPointVoltage: "單 相 3 線 110/220 伏",
  estimatedParallelDate: "",
  relatedCaseNumber: "",
  detailReview: "不需",
  detailReviewDate: "",
  externalDesign: "不需",
  externalDesignDate: "",
  otherNotes: ""
};

const numericString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?$/, "請填入數字");

const optionalNumericString = z.union([z.string().trim().length(0), numericString]);

const REQUIRED_MESSAGES = {
  ownerName: "請填寫設置者名稱",
  ownerPhone: "請填寫連絡電話",
  ownerAddress: "請填寫通訊處",
  siteAddress: "請填寫設置場所或地點",
  contactPerson: "請填寫連絡人",
  contactPhone: "請填寫連絡人電話",
  contactAddress: "請填寫連絡人通訊處",
  saleNew: "請填寫躉售容量_新增設_瓩",
  saleTotal: "請填寫躉售容量_合計_瓩",
  innerLineNumber: "併聯用戶內線時請填寫電號",
  boundaryVoltage: "請填寫責任分界點電壓",
  parallelPointVoltage: "請填寫併聯點電壓",
  estimatedParallelDate: "請填寫預計併聯日期"
};

const caseFormSchema = z.object({
  documentTitle: z.string(),
  exportFormat: z.enum(["pdf", "docx"]),
  companyName: z.string(),
  companyContactPerson: z.string(),
  companyPhone: z.string(),
  companyAddress: z.string(),
  companyTaxId: z.string(),
  caseNumber: z.string(),
  districtOffice: z.string(),
  applicationDate: z.string(),
  ownerName: z.string().trim().min(1, REQUIRED_MESSAGES.ownerName),
  principalName: z.string(),
  electricNumber: z.string(),
  ownerPhone: z.string().trim().min(1, REQUIRED_MESSAGES.ownerPhone),
  ownerAddress: z.string().trim().min(1, REQUIRED_MESSAGES.ownerAddress),
  siteAddress: z.string().trim().min(1, REQUIRED_MESSAGES.siteAddress),
  contactPerson: z.string().trim().min(1, REQUIRED_MESSAGES.contactPerson),
  contactPhone: z.string().trim().min(1, REQUIRED_MESSAGES.contactPhone),
  contactAddress: z.string().trim().min(1, REQUIRED_MESSAGES.contactAddress),
  deviceType: z.enum(DEVICE_TYPE_OPTIONS),
  energyCategory: z.enum(ENERGY_CATEGORY_OPTIONS),
  solarCategory: z.union([z.enum(INSTALLATION_CATEGORY_OPTIONS), z.literal("")]),
  installedExisting: optionalNumericString,
  installedNew: numericString,
  installedTotal: numericString,
  saleExisting: optionalNumericString,
  saleNew: optionalNumericString,
  saleTotal: optionalNumericString,
  parallelMethod: z.enum(["台電外線", "用戶內線"]),
  innerLineNumber: z.string(),
  contractType: z.string(),
  contractCapacity: z.string(),
  saleMode: z.enum([
    "僅併聯不躉售",
    "全額躉售",
    "自發自用(餘電躉售)",
    "直供餘電躉售(限第一型)",
    "轉供餘電躉售",
    "轉供自用(第二、三型)"
  ]),
  boundaryVoltage: z.string().trim().min(1, REQUIRED_MESSAGES.boundaryVoltage),
  parallelPointVoltage: z.string().trim().min(1, REQUIRED_MESSAGES.parallelPointVoltage),
  estimatedParallelDate: z.string().trim().min(1, REQUIRED_MESSAGES.estimatedParallelDate),
  relatedCaseNumber: z.string(),
  detailReview: z.enum(ADVANCED_OPTION_CHOICES),
  detailReviewDate: z.string(),
  externalDesign: z.enum(ADVANCED_OPTION_CHOICES),
  externalDesignDate: z.string(),
  otherNotes: z.string()
}).superRefine((data, ctx) => {
  if (data.saleMode !== "僅併聯不躉售") {
    if (!data.saleNew.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["saleNew"],
        message: REQUIRED_MESSAGES.saleNew
      });
    }
    if (!data.saleTotal.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["saleTotal"],
        message: REQUIRED_MESSAGES.saleTotal
      });
    }
  }

  if (data.parallelMethod === "用戶內線" && !data.innerLineNumber.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["innerLineNumber"],
      message: REQUIRED_MESSAGES.innerLineNumber
    });
  }

  const validInstallationCategories = INSTALLATION_CATEGORY_GROUPS[data.energyCategory];
  if (validInstallationCategories) {
    if (!data.solarCategory) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["solarCategory"],
        message: "請選擇設置分類"
      });
    } else if (!validInstallationCategories.includes(data.solarCategory)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["solarCategory"],
        message: "設置分類與再生能源類別不符"
      });
    }
  }
});

export function validateCaseForm(input) {
  return caseFormSchema.safeParse({
    ...CASE_FORM_DEFAULTS,
    ...input
  });
}

export function parseCaseForm(input) {
  const result = validateCaseForm(input);
  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => issue.message).join(", "));
  }
  return result.data;
}
