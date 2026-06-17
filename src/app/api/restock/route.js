import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Ачаа орох — variant үлдэгдэл нэмэх + restock_logs-д бичих
// Body: { productId, productName, size, color, qty, note }
export async function POST(request) {
  try {
    const { productId, productName, size, color, qty, note } = await request.json();
    if (!productId || !qty || qty < 1) {
      return NextResponse.json({ error: "Мэдээлэл дутуу" }, { status: 400 });
    }
    const admin = createAdminClient();

    // 1. Variant үлдэгдэлд нэмэх
    let q = admin.from("product_variants").select("id,stock").eq("product_id", productId);
    if (size) q = q.eq("size", size); else q = q.is("size", null);
    if (color) q = q.eq("color", color); else q = q.is("color", null);
    const { data: variants } = await q;
    if (!variants?.length) {
      return NextResponse.json({ error: "Variant олдсонгүй" }, { status: 404 });
    }
    const v = variants[0];
    const newStock = Number(v.stock) + Number(qty);
    await admin.from("product_variants").update({ stock: newStock }).eq("id", v.id);

    // 2. Restock log-д бичих
    await admin.from("restock_logs").insert({
      product_id: productId,
      product_name: productName,
      size: size || null,
      color: color || null,
      qty: Number(qty),
      note: note || null,
    });

    return NextResponse.json({ ok: true, newStock });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
