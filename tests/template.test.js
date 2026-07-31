import { describe, expect, it } from "vitest";

import { buildDocumentPayload } from "../app/lib/template";

describe("document payload", () => {
  it("maps case form data into official template fields", () => {
    const payload = buildDocumentPayload({
      ownerName: "吳威霖",
      principalName: "吳威霖",
      ownerPhone: "0988338787",
      ownerAddress: "高雄市鼓山區明德路31號",
      siteAddress: "高雄市鼓山區明德路31號",
      contactPerson: "黃昭華",
      contactPhone: "07-7338588",
      contactAddress: "高雄市鳥松區大同路2-58號",
      solarCategory: "屋頂",
      installedNew: "9",
      installedTotal: "9",
      saleNew: "9",
      saleTotal: "9",
      boundaryVoltage: "單 相 3 線 110/220 伏",
      parallelPointVoltage: "單 相 3 線 110/220 伏",
      estimatedParallelDate: "2026-12-31",
      applicationDate: "2026-07-30",
      otherNotes: ""
    });

    expect(payload.ownerName).toBe("吳威霖");
    expect(payload.solarCategoryLine).toContain("■屋頂");
    expect(payload.applicationDateRoc).toBe("115 年 7 月 30 日");
    expect(payload.otherNotes).toContain("台電公司於核發審查意見書後即進行細部協商");
  });
});
