import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// POS/manage хэсгээс бараа үүсгэх (нэвтрээгүй тул admin client-ээр RLS алгасна)
export async function POST(request) {
  try {
    const { name, price, discount_percent, category_id, images, variants } = await request.json();
    if (!name || !price) return NextResponse.json({ error: "Нэр болон үнэ заавал" }, { status: 400 });

    const admin = createAdminClient();
    const { data: product, error } = await admin
      .from("products")
      .insert({
        name: String(name).trim(),
        price: Number(price),
        discount_percent: Number(discount_percent) || 0,
        category_id: category_id || null,
        images: images || [],
        show_on_web: true,
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (variants || [])
      .filter((v) => v.size || v.color || v.stock_branch1 || v.stock_branch2)
      .map((v) => {
        const s1 = Number(v.stock_branch1) || 0;
        const s2 = Number(v.stock_branch2) || 0;
        return {
          product_id: product.id,
          size: v.size || null,
          color: v.color || null,
          stock_branch1: s1,
          stock_branch2: s2,
          stock: s1 + s2,
        };
      });
    if (rows.length) {
      const { error: vErr } = await admin.from("product_variants").insert(rows);
      if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: product.id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
