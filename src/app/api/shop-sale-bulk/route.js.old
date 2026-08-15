import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { items, payments, paymentMethod, branch, totalOverride } = await request.json();
    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: "Бараа сонгоогүй байна" }, { status: 400 });

    const admin = createAdminClient();

    for (const it of items) {
      if (!it.productId) continue;
      let q = admin.from("product_variants").select("id,stock").eq("product_id", it.productId);
      if (it.size) q = q.eq("size", it.size); else q = q.is("size", null);
      if (it.color) q = q.eq("color", it.color); else q = q.is("color", null);
      const { data: variants } = await q;
      if (variants?.length) {
        const v = variants[0];
        if (Number(it.qty) > Number(v.stock))
          return NextResponse.json({
            error: `${it.productName} (${[it.size, it.color].filter(Boolean).join("/")}): зөвхөн ${v.stock} ширхэг үлдсэн`,
          }, { status: 400 });
        await admin.from("product_variants").update({ stock: Number(v.stock) - Number(it.qty) }).eq("id", v.id);
      }
    }

    const rawTotal = items.reduce((s, it) => s + Number(it.unitPrice) * Number(it.qty), 0);
    const finalTotal = Number(totalOverride) > 0 ? Number(totalOverride) : rawTotal;
    const ratio = rawTotal > 0 ? finalTotal / rawTotal : 1;

    let primaryMethod = paymentMethod || "cash";
    let paymentsArray = null;
    if (Array.isArray(payments) && payments.length > 0) {
      paymentsArray = payments.filter((p) => Number(p.amount) > 0);
      if (paymentsArray.length === 1) {
        primaryMethod = paymentsArray[0].method;
      } else if (paymentsArray.length > 1) {
        const sorted = [...paymentsArray].sort((a, b) => b.amount - a.amount);
        primaryMethod = `mixed:${sorted.map((p) => p.method).join("+")}`;
      }
    }

    const order_code = `POS-${Date.now()}`;
    const rows = items.map((it) => {
      const lineRaw = Number(it.unitPrice) * Number(it.qty);
      const lineTotal = Math.round(lineRaw * ratio);
      return {
        product_id: it.productId || null,
        product_name: it.productName,
        size: it.size || null,
        color: it.color || null,
        qty: Number(it.qty || 1),
        unit_price: Math.round(lineTotal / Number(it.qty || 1)),
        total: lineTotal,
        channel: "shop",
        payment_method: primaryMethod,
        payments: paymentsArray,
        branch: branch || null,
        order_code,
      };
    });

    await admin.from("sales").insert(rows);
    return NextResponse.json({
      ok: true,
      total: finalTotal,
      rawTotal,
      itemCount: items.length,
      payments: paymentsArray,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
