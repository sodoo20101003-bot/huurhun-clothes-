import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function pad6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      customerName, phone, address, instagram, note,
      items, paymentMethod, branch, orderDate, totalOverride,
    } = body;

    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: "Бараа сонгоогүй байна" }, { status: 400 });

    const admin = createAdminClient();
    const targetBranch = branch === "branch2" ? "branch2" : "branch1";

    // 1️⃣ Stock хасах
    const stockLog = [];
    for (const it of items) {
      if (!it.productId) continue;
      let q = admin.from("product_variants").select("id,stock_branch1,stock_branch2").eq("product_id", it.productId);
      if (it.size) q = q.eq("size", it.size); else q = q.is("size", null);
      if (it.color) q = q.eq("color", it.color); else q = q.is("color", null);
      const { data: variants, error: vErr } = await q;
      if (vErr) { stockLog.push(`err: ${it.productName}`); continue; }
      if (!variants?.length) { stockLog.push(`missing: ${it.productName}`); continue; }
      const v = variants[0];
      const s1 = Number(v.stock_branch1 || 0);
      const s2 = Number(v.stock_branch2 || 0);
      const qty = Number(it.qty);
      let newS1 = s1, newS2 = s2;
      if (targetBranch === "branch1") {
        if (qty <= s1) newS1 = s1 - qty;
        else { newS1 = 0; newS2 = Math.max(0, s2 - (qty - s1)); }
      } else {
        if (qty <= s2) newS2 = s2 - qty;
        else { newS2 = 0; newS1 = Math.max(0, s1 - (qty - s2)); }
      }
      await admin.from("product_variants")
        .update({ stock_branch1: newS1, stock_branch2: newS2, stock: newS1 + newS2 })
        .eq("id", v.id);
      stockLog.push(`✓ ${it.productName} ${s1}→${newS1}|${s2}→${newS2}`);
    }

    // 2️⃣ Тооцоо
    const order_code = pad6();
    const rawTotal = items.reduce((s, it) => s + Number(it.unitPrice) * Number(it.qty), 0);
    const finalTotal = Number(totalOverride) > 0 ? Number(totalOverride) : rawTotal;
    const ratio = rawTotal > 0 ? finalTotal / rawTotal : 1;

    // 3️⃣ Orders хүснэгтэд бичих (жинхэнэ schema-той тохирсон)
    // items нь jsonb — cart-ыг бүхэлд нь хадгална
    const itemsJson = items.map((it) => {
      const lineRaw = Number(it.unitPrice) * Number(it.qty);
      const lineTotal = Math.round(lineRaw * ratio);
      return {
        productId: it.productId,
        productName: it.productName,
        size: it.size,
        color: it.color,
        qty: Number(it.qty),
        unitPrice: Math.round(lineTotal / Number(it.qty || 1)),
        total: lineTotal,
      };
    });

    // Төлбөрийн аргыг note-д хадгалах (payment_method багана байхгүй тул)
    const paymentNote = `[Төлбөр: ${paymentMethod || "cash"}]`;
    const combinedNote = note ? `${paymentNote} ${note}` : paymentNote;

    const orderPayload = {
      order_code,
      items: itemsJson,
      total: finalTotal,
      customer_name: customerName || "—",
      phone: phone || null,
      address: address || null,
      note: combinedNote,
      status: "pending",
      payment_status: "paid",
      instagram: instagram || null,
      is_manual: true,
      branch: branch || null,
    };
    if (orderDate) orderPayload.created_at = orderDate;

    const { data: order, error: orderErr } = await admin.from("orders").insert(orderPayload).select().single();
    if (orderErr) {
      return NextResponse.json({ error: `Order үүсэхэд алдаа: ${orderErr.message}`, stockLog }, { status: 500 });
    }

    // 4️⃣ Sales мөр үүсгэх (тайлан + POS түүхэд харагдана)
    const salesRows = items.map((it) => {
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
        channel: "web",
        payment_method: paymentMethod || "cash",
        branch: branch || null,
        order_code,
        is_manual: true,
        created_at: orderDate || undefined,
      };
    });
    await admin.from("sales").insert(salesRows);

    return NextResponse.json({ ok: true, order, order_code, stockLog });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
