import { z } from "zod";

export const DEFAULT_OTHER_NOTES = `配電級再生能源■需□不需 台電公司於核發審查意見書後即進行細部協商。(註12)勾選日期：
配電級再生能源■需□不需 台電公司於核發審查意見書後即進行外線設計。(註13)勾選日期：`;

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
  solarCategory: "屋頂",
  installedExisting: "",
  installedNew: "",
  installedTotal: "",
  saleExisting: "",
  saleNew: "",
  saleTotal: "",
  innerLineNumber: "",
  contractType: "",
  contractCapacity: "",
  boundaryVoltage: "單 相 3 線 110/220 伏",
  parallelPointVoltage: "單 相 3 線 110/220 伏",
  estimatedParallelDate: "",
  relatedCaseNumber: "",
  otherNotes: DEFAULT_OTHER_NOTES
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
  solarCategory: z.enum(["屋頂", "地面", "水面"]),
  installedExisting: optionalNumericString,
  installedNew: numericString,
  installedTotal: numericString,
  saleExisting: optionalNumericString,
  saleNew: numericString,
  saleTotal: numericString,
  innerLineNumber: z.string(),
  contractType: z.string(),
  contractCapacity: z.string(),
  boundaryVoltage: z.string().trim().min(1, REQUIRED_MESSAGES.boundaryVoltage),
  parallelPointVoltage: z.string().trim().min(1, REQUIRED_MESSAGES.parallelPointVoltage),
  estimatedParallelDate: z.string().trim().min(1, REQUIRED_MESSAGES.estimatedParallelDate),
  relatedCaseNumber: z.string(),
  otherNotes: z.string()
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
