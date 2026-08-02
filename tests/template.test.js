import PizZip from "pizzip";
import { describe, expect, it } from "vitest";

import { buildDocumentPayload, renderOfficialDocx } from "../app/lib/template";

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
      deviceType: "第三型",
      energyCategory: "太陽光電",
      solarCategory: "屋頂",
      installedExisting: "3",
      installedNew: "9",
      installedTotal: "9",
      saleExisting: "3",
      saleNew: "9",
      saleTotal: "9",
      parallelMethod: "用戶內線",
      innerLineNumber: "IL-12",
      contractType: "低壓電力",
      contractCapacity: "49.5",
      saleMode: "轉供自用(第二、三型)",
      boundaryVoltage: "單 相 3 線 110/220 伏",
      parallelPointVoltage: "單 相 3 線 110/220 伏",
      estimatedParallelDate: "2026-12-31",
      applicationDate: "2026-07-30",
      relatedCaseNumber: "A-0007",
      otherNotes: "補充備註"
    });

    expect(payload.ownerName).toBe("吳威霖");
    expect(payload.caseNumber).toBe("A-001");
    expect(payload.districtOffice).toBe("高雄區處");
    expect(payload.electricNumber).toBe("12-34-5678-90-1");
    expect(payload.installedExisting).toBe("3 瓩");
    expect(payload.saleExisting).toBe("3 瓩");
    expect(payload.saleNew).toBe("9 瓩");
    expect(payload.saleTotal).toBe("9 瓩");
    expect(payload.parallelMethod).toBe("用戶內線");
    expect(payload.contractType).toBe("低壓電力");
    expect(payload.saleMode).toBe("轉供自用(第二、三型)");
    expect(payload.relatedCaseNumber).toBe("A-0007");
    expect(payload.deviceTypeLine).toContain("■第三型");
    expect(payload.energyCategoryLine).toContain("■太陽光電");
    expect(payload.solarCategoryLine).toContain("■屋頂");
    expect(payload.applicationDateRoc).toBe("115 年 7 月 30 日");
    expect(payload.otherNotes).toContain("細部協商");
    expect(payload.otherNotes).toContain("外線設計");
    expect(payload.otherNotes).toContain("補充備註");
  });

  it("keeps kw units visible for blank existing capacity fields", () => {
    const payload = buildDocumentPayload({
      ownerName: "吳威霖",
      ownerPhone: "0988338787",
      ownerAddress: "高雄市鼓山區明德路31號",
      siteAddress: "高雄市大寮區光明路88號",
      contactPerson: "黃昭華",
      contactPhone: "07-7338588",
      contactAddress: "高雄市鳥松區大同路2-58號",
      installedExisting: "",
      installedNew: "9",
      installedTotal: "9",
      saleExisting: "",
      saleNew: "9",
      saleTotal: "9",
      estimatedParallelDate: "2026-12-31"
    });

    expect(payload.installedExisting).toBe("瓩");
    expect(payload.saleExisting).toBe("瓩");
  });

  it("keeps site address and applicant signature text in exported docx", async () => {
    const docxBuffer = await renderOfficialDocx({
      ownerName: "吳威霖",
      ownerPhone: "0988338787",
      ownerAddress: "高雄市鼓山區明德路31號",
      siteAddress: "高雄市大寮區光明路88號",
      contactPerson: "黃昭華",
      contactPhone: "07-7338588",
      contactAddress: "高雄市鳥松區大同路2-58號",
      installedNew: "9",
      installedTotal: "9",
      saleNew: "9",
      saleTotal: "9",
      estimatedParallelDate: "2026-12-31"
    });
    const xml = new PizZip(docxBuffer).file("word/document.xml").asText();

    expect(xml).toContain("設置場所或地點（註3）");
    expect(xml).toContain("高雄市大寮區光明路88號");
    expect(xml).toContain("申請人");
    expect(xml).toContain("簽章");
    expect(xml).toMatch(/<w:tcW w:w="983" w:type="dxa"\/><w:gridSpan w:val="2"\/><w:vMerge w:val="restart"\/>[\s\S]*?申請人[\s\S]*?簽章/);
    expect(xml).not.toMatch(/<w:tcW w:w="3828" w:type="dxa"\/><w:gridSpan w:val="5"\/><w:vMerge w:val="restart"\/>[\s\S]*?申請人[\s\S]*?簽章/);
  });
});
