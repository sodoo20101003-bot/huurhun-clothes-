import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Дэлгүүрээс зарагдсан барааг бүртгэх
// Body: { productId, productName, size, color, qty, unitPrice, paymentMethod: 'cash'|'card' }
export async function POST(request) {
  try {
    const { productId, productName, size, color, qty, unitPrice, paymentMethod } = await request.json();

    if (!productName || !qty) {
      return NextResponse.json({ error: "Мэдээлэл дутуу" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Үлдэгдэл шалгах + хасах
    if (productId) {
      let q = admin.from("product_variants").select("id,stock").eq("product_id", productId);
      if (size) q = q.eq("size", size); else q = q.is("size", null);
      if (color) q = q.eq("color", color); else q = q.is("color", null);
      const { data: variants } = await q;
      if (variants?.length) {
        const v = variants[0];
        if (Number(qty) > Number(v.stock)) {
          return NextResponse.json({ error: `Зөвхөн ${v.stock} ширхэг үлдсэн байна` }, { status: 400 });
        }
        await admin
          .from("product_variants")
          .update({ stock: Number(v.stock) - Number(qty) })
          .eq("id", v.id);
      }
    }

    // 2. Борлуулалтын дэвтэрт бичих
    await admin.from("sales").insert({
      product_id: productId || null,
      product_name: productName,
      size: size || null,
      color: color || null,
      qty: Number(qty),
      unit_price: Number(unitPrice || 0),
      total: Number(unitPrice || 0) * Number(qty),
      channel: "shop",
      payment_method: paymentMethod || "cash",
      order_code: null,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
