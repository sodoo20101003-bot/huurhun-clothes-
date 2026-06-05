import { NextResponse } from "next/server";

// QPay тохиргоог шалгах debug route.
// Утгыг бүхэлд нь биш, зөвхөн урт + эхний тэмдэгтүүдийг л харуулна.
export async function GET() {
  const env = {
    QPAY_USERNAME: process.env.QPAY_USERNAME,
    QPAY_PASSWORD: process.env.QPAY_PASSWORD,
    QPAY_INVOICE_CODE: process.env.QPAY_INVOICE_CODE,
    QPAY_BASE_URL: process.env.QPAY_BASE_URL,
  };

  const summary = {};
  for (const [k, v] of Object.entries(env)) {
    if (!v) {
      summary[k] = { exists: false };
    } else {
      summary[k] = {
        exists: true,
        length: v.length,
        startsWith: v.slice(0, 5),
        endsWith: v.slice(-3),
        hasTrailingSpace: v !== v.trim(),
        hasQuotes: v.includes('"') || v.includes("'"),
      };
    }
  }

  // Token авч үзэх
  let tokenStatus = null;
  if (env.QPAY_USERNAME && env.QPAY_PASSWORD) {
    try {
      const base = (env.QPAY_BASE_URL || "https://merchant.qpay.mn/v2").trim();
      const auth = Buffer.from(`${env.QPAY_USERNAME.trim()}:${env.QPAY_PASSWORD.trim()}`).toString("base64");
      const res = await fetch(`${base}/auth/token`, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      });
      const text = await res.text();
      tokenStatus = { status: res.status, body: text.slice(0, 300) };
    } catch (e) {
      tokenStatus = { error: e.message };
    }
  }

  return NextResponse.json({ env: summary, tokenStatus });
}
