import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getQpayToken, qpayBaseUrl } from "@/lib/qpay";

export const dynamic = "force-dynamic";

export async function GET(request) { return handle(request); }
export async function POST(request) { return handle(request); }

async function handle(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code) return NextResponse.json({ error: "code дутуу" }, { status: 400 });

    const admin = createAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select("id, order_code, qpay_invoice_id, payment_status, items")
      .eq("order_code", code)
      .single();
    if (!order) return NextResponse.json({ error: "Захиалга олдсонгүй" }, { status: 404 });

    if (order.payment_status === "paid") {
      return NextResponse.json({ ok: true, paid: true });
    }

    let paid = false;
    let bankName = "qpay";
    try {
      const token = await getQpayToken();
      if (token && order.qpay_invoice_id) {
        const checkRes = await fetch(`${qpayBaseUrl()}/payment/check`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            object_type: "INVOICE",
            object_id: order.qpay_invoice_id,
            offset: { page_number: 1, page_limit: 100 },
          }),
        });
        const check = await checkRes.json();
        paid = (Number(check?.count) > 0) || (Number(check?.paid_amount) > 0);
        // Аль банкаар төлснийг авах (rows[0].payment_wallet эсвэл paid_by)
        const row = check?.rows?.[0];
        if (row) {
          bankName = row.payment_wallet || row.paid_by || row.payment_name || "qpay";
        }
      }
    } catch (e) {
      console.error("QPay check error:", e.message);
    }

    if (paid) {
      await admin
        .from("orders")
        .update({ payment_status: "paid", status: "paid" })
        .eq("id", order.id);

      // Борлуулалтын дэвтэрт бичих (давхардахгүй — нэг л удаа)
      const { data: existing } = await admin
        .from("sales")
        .select("id")
        .eq("order_code", order.order_code)
        .limit(1);
      if (!existing?.length) {
        const rows = (order.items || []).map((it) => ({
          product_id: it.productId || null,
          product_name: it.name || "Бараа",
          size: it.size || null,
          color: it.color || null,
          qty: Number(it.qty || 1),
          unit_price: Number(it.unitPrice || 0),
          total: Number(it.unitPrice || 0) * Number(it.qty || 1),
          channel: "web",
          payment_method: bankName,
          order_code: order.order_code,
        }));
        if (rows.length) await admin.from("sales").insert(rows);
      }
    }

    return NextResponse.json({ ok: true, paid });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
