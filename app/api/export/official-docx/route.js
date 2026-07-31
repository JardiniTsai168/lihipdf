import { NextResponse } from "next/server";

import { renderOfficialDocx } from "../../../lib/template";

export async function POST(request) {
  try {
    const payload = await request.json();
    const caseData = payload.case || payload;
    const docxBuffer = await renderOfficialDocx(caseData);

    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition":
          "attachment; filename=\"lihipdf-solar-form.docx\"; filename*=UTF-8''%E5%86%8D%E7%94%9F%E8%83%BD%E6%BA%90%E7%99%BC%E9%9B%BB%E8%A8%AD%E5%82%99%E4%BD%B5%E8%81%AF%E5%AF%A9%E6%9F%A5%E7%94%B3%E8%AB%8B%E8%A1%A8.docx"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message ?? "DOCX export failed" },
      { status: 400 }
    );
  }
}
