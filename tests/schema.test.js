import { describe, expect, it } from "vitest";

import { CASE_FORM_DEFAULTS, parseCaseForm } from "../app/lib/schema";

describe("case form schema", () => {
  it("provides a usable first-case default state", () => {
    expect(CASE_FORM_DEFAULTS.documentTitle).toBe("再生能源發電設備併聯審查申請表");
    expect(CASE_FORM_DEFAULTS.solarCategory).toBe("屋頂");
    expect(CASE_FORM_DEFAULTS.boundaryVoltage).toBe("單 相 3 線 110/220 伏");
    expect(CASE_FORM_DEFAULTS.exportFormat).toBe("pdf");
  });

  it("accepts a valid single-form payload", () => {
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
      estimatedParallelDate: "2026-12-31"
    });

    expect(result.ownerName).toBe("王小明");
    expect(result.siteAddress).toContain("高雄市");
  });

  it("rejects missing required case data", () => {
    expect(() =>
      parseCaseForm({
        ...CASE_FORM_DEFAULTS,
        ownerName: "",
        ownerPhone: "",
        siteAddress: ""
      })
    ).toThrow(/ownerName|ownerPhone|siteAddress/);
  });
});
