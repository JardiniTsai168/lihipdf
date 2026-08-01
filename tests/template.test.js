import { describe, expect, it } from "vitest";

import { buildDocumentPayload } from "../app/lib/template";

describe("document payload", () => {
  it("maps case form data into official template fields", () => {
    const payload = buildDocumentPayload({
      caseNumber: "A-001",
      districtOffice: "高雄區處",
      ownerName: "吳威霖",
      principalName: "吳威霖",
      electricNumber: "12-34-5678-90-1",
      ownerPhone: "0988338787",
      ownerAddress: "高雄市鼓山區明德路31號",
      siteAddress: "高雄市鼓山區明德路31號",
      contactPerson: "黃昭華",
      contactPhone: "07-7338588",
      contactAddress: "高雄市鳥松區大同路2-58號",
      solarCategory: "屋頂",
      installedExisting: "3",
      installedNew: "9",
      installedTotal: "9",
      saleExisting: "3",
      saleNew: "9",
      saleTotal: "9",
      innerLineNumber: "IL-12",
      contractType: "低壓併聯",
      contractCapacity: "49.5kW",
      boundaryVoltage: "單 相 3 線 110/220 伏",
      parallelPointVoltage: "單 相 3 線 110/220 伏",
      estimatedParallelDate: "2026-12-31",
      applicationDate: "2026-07-30",
      relatedCaseNumber: "A-0007",
      otherNotes: ""
    });

    expect(payload.ownerName).toBe("吳威霖");
    expect(payload.caseNumber).toBe("A-001");
    expect(payload.districtOffice).toBe("高雄區處");
    expect(payload.electricNumber).toBe("12-34-5678-90-1");
    expect(payload.installedExisting).toBe("3");
    expect(payload.saleExisting).toBe("3");
    expect(payload.contractType).toBe("低壓併聯");
    expect(payload.relatedCaseNumber).toBe("A-0007");
    expect(payload.solarCategoryLine).toContain("■屋頂");
    expect(payload.applicationDateRoc).toBe("115 年 7 月 30 日");
    expect(payload.otherNotes).toContain("台電公司於核發審查意見書後即進行細部協商");
  });
});
