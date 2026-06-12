import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Дэлгүүрээс 1+1 хосолсон зарагдсан 2 барааг бүртгэх
// Body: {
//   items: [{productId, productName, size, color, qty, unitPrice}, ...] (2 ширхэг)
//   totalPrice: <pair_price буюу хосын нийт үнэ>,
//   paymentMethod: 'cash'|'card'|'pocket'|'storepay'
// }
export async function POST(request) {
  try {
    const { items, totalPrice, paymentMethod } = await request.json();

    if (!Array.isArray(items) || items.length !== 2) {
      return NextResponse.json({ error: "1+1 зарахад 2 бараа байх ёстой" }, { status: 400 });
    }
    if (!totalPrice || totalPrice <= 0) {
      return NextResponse.json({ error: "Нийт үнэ буруу" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Үлдэгдэл шалгах + хасах (хоёуланг нь)
    for (const it of items) {
      if (!it.productId) continue;
      let q = admin.from("product_variants").select("id,stock").eq("product_id", it.productId);
      if (it.size) q = q.eq("size", it.size); else q = q.is("size", null);
      if (it.color) q = q.eq("color", it.color); else q = q.is("color", null);
      const { data: variants } = await q;
      if (variants?.length) {
        const v = variants[0];
        if (Number(it.qty) > Number(v.stock)) {
          return NextResponse.json({ error: `${it.productName}: ${v.stock} ширхэг үлдсэн` }, { status: 400 });
        }
        await admin
          .from("product_variants")
          .update({ stock: Number(v.stock) - Number(it.qty) })
          .eq("id", v.id);
      }
    }

    // 2. Pair үнийг 2 бараанд тэнцүү хувиарлах
    const splitPrice = Math.round(Number(totalPrice) / 2);
    const order_code = `SHOP-PAIR-${Date.now()}`;

    // 3. 2 sales бичлэг үүсгэх (нэг хосолсон зарагдалт)
    const rows = items.map((it) => ({
      product_id: it.productId || null,
      product_name: it.productName,
      size: it.size || null,
      color: it.color || null,
      qty: Number(it.qty || 1),
      unit_price: splitPrice,
      total: splitPrice,
      channel: "shop",
      payment_method: paymentMethod || "cash",
      order_code,
    }));

    await admin.from("sales").insert(rows);

    return NextResponse.json({ ok: true, totalPrice, splitPrice });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
