import { describe, expect, it } from "vitest";

import { CASE_FORM_DEFAULTS, parseCaseForm } from "../app/lib/schema";

describe("case form schema", () => {
  it("provides a usable first-case default state", () => {
    expect(CASE_FORM_DEFAULTS.documentTitle).toBe("再生能源發電設備併聯審查申請表");
    expect(CASE_FORM_DEFAULTS.solarCategory).toBe("屋頂");
    expect(CASE_FORM_DEFAULTS.boundaryVoltage).toBe("單 相 3 線 110/220 伏");
    expect(CASE_FORM_DEFAULTS.parallelPointVoltage).toBe("單 相 3 線 110/220 伏");
    expect(CASE_FORM_DEFAULTS.exportFormat).toBe("pdf");
    expect(CASE_FORM_DEFAULTS.caseNumber).toBe("");
    expect(CASE_FORM_DEFAULTS.installedExisting).toBe("");
    expect(CASE_FORM_DEFAULTS.parallelMethod).toBe("台電外線");
    expect(CASE_FORM_DEFAULTS.saleMode).toBe("全額躉售");
  });

  it("accepts a valid single-form payload", () => {
    const result = parseCaseForm({
      ...CASE_FORM_DEFAULTS,
      ownerName: "王小明",
      caseNumber: "A-001",
      districtOffice: "高雄區處",
      ownerPhone: "0912345678",
      electricNumber: "12-34-5678-90-1",
      ownerAddress: "高雄市鼓山區明德路31號",
      siteAddress: "高雄市鼓山區明德路31號",
      contactPerson: "黃昭華",
      contactPhone: "07-7338588",
      contactAddress: "高雄市鳥松區大同路2-58號",
      installedExisting: "",
      installedNew: "9",
      installedTotal: "9",
      saleExisting: "",
      saleNew: "9",
      saleTotal: "9",
      boundaryVoltage: "dummy-boundary-voltage",
      parallelPointVoltage: "dummy-parallel-voltage",
      parallelMethod: "用戶內線",
      innerLineNumber: "IL-12",
      saleMode: "全額躉售",
      estimatedParallelDate: "2026-12-31"
    });

    expect(result.ownerName).toBe("王小明");
    expect(result.siteAddress).toContain("高雄市");
    expect(result.caseNumber).toBe("A-001");
  });

  it("rejects missing required case data", () => {
    expect(() =>
      parseCaseForm({
        ...CASE_FORM_DEFAULTS,
        ownerName: "",
        ownerPhone: "",
        siteAddress: ""
      })
    ).toThrow(/請填寫設置者名稱|請填寫連絡電話|請填寫設置場所或地點/);
  });

  it("allows blank躉售容量 when sale mode is 僅併聯不躉售", () => {
    const result = parseCaseForm({
      ...CASE_FORM_DEFAULTS,
      ownerName: "王小明",
      ownerPhone: "0912345678",
      ownerAddress: "高雄市鼓山區明德路31號",
      siteAddress: "高雄市鼓山區明德路31號",
      contactPerson: "黃昭華",
      contactPhone: "07-7338588",
      contactAddress: "高雄市鳥松區大同路2-58號",
      installedNew: "9",
      installedTotal: "9",
      saleMode: "僅併聯不躉售",
      saleNew: "",
      saleTotal: "",
      boundaryVoltage: "dummy-boundary-voltage",
      parallelPointVoltage: "dummy-parallel-voltage",
      estimatedParallelDate: "2026-12-31"
    });

    expect(result.saleMode).toBe("僅併聯不躉售");
    expect(result.saleNew).toBe("");
  });

  it("only requires 電號 when parallel method is 用戶內線", () => {
    const result = parseCaseForm({
      ...CASE_FORM_DEFAULTS,
      ownerName: "王小明",
      ownerPhone: "0912345678",
      ownerAddress: "高雄市鼓山區明德路31號",
      siteAddress: "高雄市鼓山區明德路31號",
      contactPerson: "黃昭華",
      contactPhone: "07-7338588",
      contactAddress: "高雄市鳥松區大同路2-58號",
      installedNew: "9",
      installedTotal: "9",
      saleNew: "9",
      saleTotal: "9",
      parallelMethod: "用戶內線",
      innerLineNumber: "IL-12",
      contractType: "",
      contractCapacity: "",
      boundaryVoltage: "dummy-boundary-voltage",
      parallelPointVoltage: "dummy-parallel-voltage",
      estimatedParallelDate: "2026-12-31"
    });

    expect(result.parallelMethod).toBe("用戶內線");
    expect(result.contractType).toBe("");
    expect(result.contractCapacity).toBe("");
  });
});
