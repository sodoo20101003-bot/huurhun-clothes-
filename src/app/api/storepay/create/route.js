import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STOREPAY_BASE = "https://service.storepay.mn/lend-merchant";
const STOREPAY_AUTH_URL = "https://service.storepay.mn/merchantuaa/oauth/token";

const STORE_ID = process.env.STOREPAY_STORE_ID;
const APP_USERNAME = process.env.STOREPAY_APP_USERNAME;
const APP_PASSWORD = process.env.STOREPAY_APP_PASSWORD;
const BASIC_USERNAME = process.env.STOREPAY_BASIC_USERNAME;
const BASIC_PASSWORD = process.env.STOREPAY_BASIC_PASSWORD;

function pad6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// StorePay-ээс access token авах
async function getStorePayToken() {
  const basicAuth = Buffer.from(`${BASIC_USERNAME}:${BASIC_PASSWORD}`).toString("base64");
  const url = `${STOREPAY_AUTH_URL}?grant_type=password&username=${encodeURIComponent(APP_USERNAME)}&password=${encodeURIComponent(APP_PASSWORD)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`StorePay auth failed: ${res.status} - ${errText}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error("access_token missing");
  return data.access_token;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { items, customerName, phone, address, note, instagram, mobileNumber } = body;

    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: "Бараа сонгоогүй байна" }, { status: 400 });
    if (!mobileNumber && !phone)
      return NextResponse.json({ error: "Утасны дугаар шаардлагатай" }, { status: 400 });

    const admin = createAdminClient();

    // Stock шалгах
    for (const it of items) {
      if (!it.productId) continue;
      let q = admin.from("product_variants").select("stock").eq("product_id", it.productId);
      if (it.size) q = q.eq("size", it.size); else q = q.is("size", null);
      if (it.color) q = q.eq("color", it.color); else q = q.is("color", null);
      const { data: variants } = await q;
      if (variants?.length) {
        const totalStock = Number(variants[0].stock || 0);
        if (Number(it.qty) > totalStock) {
          return NextResponse.json({
            error: `${it.productName} үлдэгдэлгүй байна`,
          }, { status: 400 });
        }
      }
    }

    // Нийт дүн + delivery
    const itemsTotal = items.reduce((s, it) => s + Number(it.unitPrice) * Number(it.qty), 0);
    const deliveryFee = 7000;
    const totalAmount = itemsTotal + deliveryFee;

    const order_code = pad6();
    const requestId = `HH-${order_code}-${Date.now()}`;

    // 1️⃣ StorePay token авах
    const token = await getStorePayToken();

    // 2️⃣ Нэхэмжлэл үүсгэх
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://huurhunclothes.com";
    const loanPayload = {
      storeId: Number(STORE_ID),
      mobileNumber: String(mobileNumber || phone).replace(/\D/g, ""),
      description: `huurhun_clothes #${order_code}`,
      amount: totalAmount,
      callbackUrl: `${siteUrl}/api/storepay/callback?order_code=${order_code}`,
      requestId,
    };

    const loanRes = await fetch(`${STOREPAY_BASE}/merchant/loan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(loanPayload),
    });

    if (!loanRes.ok) {
      const errText = await loanRes.text();
      return NextResponse.json({ error: `StorePay нэхэмжлэл алдаа: ${errText}` }, { status: 500 });
    }

    const loanData = await loanRes.json();
    if (loanData.status !== "Success") {
      const msg = loanData.msgList?.[0]?.code || "StorePay татгалзсан";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const loanId = loanData.value;

    // 3️⃣ Order-ыг DB-д хадгалах (pending)
    const itemsJson = items.map((it) => ({
      productId: it.productId,
      productName: it.productName,
      size: it.size,
      color: it.color,
      qty: Number(it.qty),
      unitPrice: Number(it.unitPrice),
      total: Number(it.unitPrice) * Number(it.qty),
    }));

    const orderPayload = {
      order_code,
      items: itemsJson,
      total: totalAmount,
      customer_name: customerName || "—",
      phone: phone || mobileNumber,
      address: address || null,
      note: note || null,
      status: "pending",
      payment_status: "pending",
      instagram: instagram || null,
      qpay_invoice_id: `SP-${loanId}`, // StorePay loanId-ыг хадгална
      qpay_qr_text: requestId, // requestId-г хадгална
    };
    await admin.from("orders").insert(orderPayload);

    return NextResponse.json({
      ok: true,
      order_code,
      loanId,
      requestId,
      total: totalAmount,
      message: "StorePay нэхэмжлэл үүслээ. Утсанд ирсэн зөвшөөрлийг хүлээж авна уу.",
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
