import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STOREPAY_BASE = "https://service.storepay.mn/lend-merchant";
const STOREPAY_AUTH_URL = "https://service.storepay.mn/merchant-uaa/oauth/token";

const APP_USERNAME = process.env.STOREPAY_APP_USERNAME;
const APP_PASSWORD = process.env.STOREPAY_APP_PASSWORD;
const BASIC_USERNAME = process.env.STOREPAY_BASIC_USERNAME;
const BASIC_PASSWORD = process.env.STOREPAY_BASIC_PASSWORD;

async function getStorePayToken() {
  const basicAuth = Buffer.from(`${BASIC_USERNAME}:${BASIC_PASSWORD}`).toString("base64");
  const url = `${STOREPAY_AUTH_URL}?grant_type=password&username=${encodeURIComponent(APP_USERNAME)}&password=${encodeURIComponent(APP_PASSWORD)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Authorization": `Basic ${basicAuth}` },
  });
  if (!res.ok) throw new Error("Auth failed");
  const data = await res.json();
  return data.access_token;
}

export async function POST(request) {
  try {
    const { order_code } = await request.json();
    if (!order_code) return NextResponse.json({ error: "order_code хэрэгтэй" }, { status: 400 });

    const admin = createAdminClient();
    const { data: order } = await admin.from("orders")
      .select("*").eq("order_code", order_code).single();

    if (!order) return NextResponse.json({ error: "Захиалга олдсонгүй" }, { status: 404 });

    // Аль хэдийн төлбөр төлсөн бол шууд OK
    if (order.payment_status === "paid") {
      return NextResponse.json({ ok: true, paid: true, order });
    }

    // qpay_invoice_id талбарт "SP-{loanId}" гэж хадгалсан
    if (!order.qpay_invoice_id?.startsWith("SP-")) {
      return NextResponse.json({ ok: false, paid: false, message: "StorePay захиалга биш" });
    }
    const loanId = order.qpay_invoice_id.replace("SP-", "");

    // StorePay-ээс шалгах
    const token = await getStorePayToken();
    const checkRes = await fetch(`${STOREPAY_BASE}/merchant/loan/check/${loanId}`, {
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (!checkRes.ok) {
      return NextResponse.json({ error: "StorePay шалгах алдаа" }, { status: 500 });
    }

    const checkData = await checkRes.json();
    const isPaid = checkData.value === true || checkData.data?.status === "confirmed" || checkData.data?.isConfirmed === true;

    if (isPaid) {
      // Payment paid болгож, stock хасах
      await markPaidAndDeductStock(admin, order);
      return NextResponse.json({ ok: true, paid: true });
    }

    return NextResponse.json({ ok: true, paid: false, status: checkData.data?.status || "pending" });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function markPaidAndDeductStock(admin, order) {
  // Order-ыг paid болгох
  await admin.from("orders")
    .update({ payment_status: "paid", status: "pending" })
    .eq("order_code", order.order_code);

  // Stock хасах + sales мөр бичих (веб захиалга нь ихэвчлэн Салбар 1-ээс)
  const items = Array.isArray(order.items) ? order.items : [];
  const targetBranch = "branch1";

  for (const it of items) {
    if (!it.productId) continue;
    let q = admin.from("product_variants").select("id,stock_branch1,stock_branch2").eq("product_id", it.productId);
    if (it.size) q = q.eq("size", it.size); else q = q.is("size", null);
    if (it.color) q = q.eq("color", it.color); else q = q.is("color", null);
    const { data: variants } = await q;
    if (variants?.length) {
      const v = variants[0];
      const s1 = Number(v.stock_branch1 || 0);
      const s2 = Number(v.stock_branch2 || 0);
      const qty = Number(it.qty);
      let newS1 = s1, newS2 = s2;
      if (qty <= s1) newS1 = s1 - qty;
      else { newS1 = 0; newS2 = Math.max(0, s2 - (qty - s1)); }
      await admin.from("product_variants")
        .update({ stock_branch1: newS1, stock_branch2: newS2, stock: newS1 + newS2 })
        .eq("id", v.id);
    }
  }

  // Sales мөр
  const salesRows = items.map((it) => ({
    product_id: it.productId || null,
    product_name: it.productName,
    size: it.size || null,
    color: it.color || null,
    qty: Number(it.qty || 1),
    unit_price: Number(it.unitPrice),
    total: Number(it.unitPrice) * Number(it.qty),
    channel: "web",
    payment_method: "storepay",
    branch: targetBranch,
    order_code: order.order_code,
    is_manual: false,
  }));
  await admin.from("sales").insert(salesRows);
}
