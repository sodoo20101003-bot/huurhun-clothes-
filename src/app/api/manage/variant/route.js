import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Байгаа бараанд шинэ размер/өнгө (variant) нэмэх — admin client-ээр RLS алгасна
export async function POST(request) {
  try {
    const { productId, size, color, stock_branch1, stock_branch2 } = await request.json();
    if (!productId) return NextResponse.json({ error: "productId заавал" }, { status: 400 });
    if (!size && !color) return NextResponse.json({ error: "Размер эсвэл өнгө оруулна уу" }, { status: 400 });

    const admin = createAdminClient();

    // Давхардал шалгах
    let q = admin.from("product_variants").select("id").eq("product_id", productId);
    if (size) q = q.eq("size", size); else q = q.is("size", null);
    if (color) q = q.eq("color", color); else q = q.is("color", null);
    const { data: existing } = await q;
    if (existing?.length) {
      return NextResponse.json({ error: "Энэ размер/өнгө аль хэдийн байна" }, { status: 409 });
    }

    const s1 = Number(stock_branch1) || 0;
    const s2 = Number(stock_branch2) || 0;
    const { error } = await admin.from("product_variants").insert({
      product_id: productId,
      size: size || null,
      color: color || null,
      stock_branch1: s1,
      stock_branch2: s2,
      stock: s1 + s2,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
