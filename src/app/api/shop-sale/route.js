import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// ⚠️ Хуучин API — branch-aware болгосон (stock = stock_branch1 + stock_branch2)
export async function POST(request) {
  try {
    const { productId, productName, size, color, qty, paymentMethod, branch } = await request.json();
    if (!productId || !qty) return NextResponse.json({ error: "productId, qty заавал" }, { status: 400 });

    const admin = createAdminClient();
    const targetBranch = branch === "branch2" ? "branch2" : "branch1";

    let q = admin.from("product_variants").select("id,stock_branch1,stock_branch2").eq("product_id", productId);
    if (size) q = q.eq("size", size); else q = q.is("size", null);
    if (color) q = q.eq("color", color); else q = q.is("color", null);
    const { data: variants } = await q;
    if (variants?.length) {
      const v = variants[0];
      const s1 = Number(v.stock_branch1 || 0);
      const s2 = Number(v.stock_branch2 || 0);
      const total = s1 + s2;
      if (Number(qty) > total)
        return NextResponse.json({ error: `Зөвхөн ${total} ширхэг үлдсэн байна` }, { status: 400 });

      let newS1 = s1, newS2 = s2;
      const n = Number(qty);
      if (targetBranch === "branch1") {
        if (n <= s1) newS1 = s1 - n;
        else { newS1 = 0; newS2 = s2 - (n - s1); }
      } else {
        if (n <= s2) newS2 = s2 - n;
        else { newS2 = 0; newS1 = s1 - (n - s2); }
      }
      await admin.from("product_variants")
        .update({ stock_branch1: newS1, stock_branch2: newS2, stock: newS1 + newS2 })
        .eq("id", v.id);
    }

    await admin.from("sales").insert({
      product_id: productId,
      product_name: productName,
      size: size || null,
      color: color || null,
      qty: Number(qty),
      unit_price: 0,
      total: 0,
      channel: "shop",
      payment_method: paymentMethod || "cash",
      branch: branch || null,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
