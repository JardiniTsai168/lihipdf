import { NextResponse } from "next/server";

import { renderOfficialPdf } from "../../../lib/template";

export async function POST(request) {
  try {
    const payload = await request.json();
    console.log('[PDF export] Received payload:', JSON.stringify(payload, null, 2));
    
    // 支援兩種格式：直接 case 欄位 或 { case: {...} }
    const caseData = payload.case || payload;
    
    const pdfBuffer = await renderOfficialPdf(caseData);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          "attachment; filename=\"lihipdf-solar-form.pdf\"; filename*=UTF-8''%E5%86%8D%E7%94%9F%E8%83%BD%E6%BA%90%E7%99%BC%E9%9B%BB%E8%A8%AD%E5%82%99%E4%BD%B5%E8%81%AF%E5%AF%A9%E6%9F%A5%E7%94%B3%E8%AB%8B%E8%A1%A8.pdf"
      }
    });
  } catch (error) {
    console.error('[PDF export] Error:', error);
    return NextResponse.json(
      { error: error?.message ?? "PDF export failed" },
      { status: 400 }
    );
  }
}
