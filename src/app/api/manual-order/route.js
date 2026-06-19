import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const {
      customer_name, phone, address, note, instagram,
      items, total, payment_method,
    } = await request.json();

    if (!customer_name || !phone || !address)
      return NextResponse.json({ error: "Хэрэглэгчийн нэр, утас, хаяг заавал" }, { status: 400 });
    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: "Бараа сонгоогүй байна" }, { status: 400 });

    const admin = createAdminClient();
    const order_code = String(Math.floor(100000 + Math.random() * 900000));

    const orderItems = items.map((it) => ({
      productId: it.productId || null,
      name: it.productName,
      size: it.size || null,
      color: it.color || null,
      qty: Number(it.qty),
      unitPrice: Number(it.unitPrice),
    }));

    // Instagram-ыг тэмдэглэлд оруулна
    let finalNote = note || "";
    if (instagram) {
      const igClean = instagram.startsWith("@") ? instagram : `@${instagram}`;
      finalNote = `📷 Instagram: ${igClean}${finalNote ? `\n${finalNote}` : ""}`;
    }

    const { data: order, error: orderErr } = await admin.from("orders").insert({
      order_code,
      customer_name,
      phone,
      address,
      note: finalNote || null,
      items: orderItems,
      total: Number(total),
      status: "pending",
      payment_status: "paid",
      status_message: "Гараар оруулсан захиалга",
    }).select().single();

    if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

    for (const it of items) {
      if (it.productId) {
        let q = admin.from("product_variants").select("id,stock").eq("product_id", it.productId);
        if (it.size) q = q.eq("size", it.size); else q = q.is("size", null);
        if (it.color) q = q.eq("color", it.color); else q = q.is("color", null);
        const { data: variants } = await q;
        if (variants?.length) {
          const v = variants[0];
          await admin.from("product_variants")
            .update({ stock: Math.max(0, Number(v.stock) - Number(it.qty)) })
            .eq("id", v.id);
        }
      }
      await admin.from("sales").insert({
        product_id: it.productId || null,
        product_name: it.productName,
        size: it.size || null,
        color: it.color || null,
        qty: Number(it.qty),
        unit_price: Number(it.unitPrice),
        total: Number(it.unitPrice) * Number(it.qty),
        channel: "web",
        payment_method: payment_method || "cash",
        order_code,
      });
    }

    return NextResponse.json({ ok: true, order_code, order });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
