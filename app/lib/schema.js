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
  ownerName: z.string().trim().min(1, "ownerName is required"),
  principalName: z.string(),
  electricNumber: z.string(),
  ownerPhone: z.string().trim().min(1, "ownerPhone is required"),
  ownerAddress: z.string().trim().min(1, "ownerAddress is required"),
  siteAddress: z.string().trim().min(1, "siteAddress is required"),
  contactPerson: z.string().trim().min(1, "contactPerson is required"),
  contactPhone: z.string().trim().min(1, "contactPhone is required"),
  contactAddress: z.string().trim().min(1, "contactAddress is required"),
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
  boundaryVoltage: z.string().trim().min(1, "boundaryVoltage is required"),
  parallelPointVoltage: z.string().trim().min(1, "parallelPointVoltage is required"),
  estimatedParallelDate: z.string().trim().min(1, "estimatedParallelDate is required"),
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
