import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// ⚠️ Хуучин API — branch-aware болгосон
export async function POST(request) {
  try {
    const { items, paymentMethod, branch } = await request.json();
    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: "Бараа сонгоогүй" }, { status: 400 });

    const admin = createAdminClient();
    const targetBranch = branch === "branch2" ? "branch2" : "branch1";

    for (const it of items) {
      if (!it.productId) continue;
      let q = admin.from("product_variants").select("id,stock_branch1,stock_branch2").eq("product_id", it.productId);
      if (it.size) q = q.eq("size", it.size); else q = q.is("size", null);
      if (it.color) q = q.eq("color", it.color); else q = q.is("color", null);
      const { data: variants } = await q;
      if (variants?.length) {
        const v = variants[0];
        const s1 = Number(v.stock_branch1 || 0);
        const s2 = Number(v.stock_branch2 || 0);
        const total = s1 + s2;
        const n = Number(it.qty);
        if (n > total)
          return NextResponse.json({ error: `${it.productName}: ${total} ширхэг үлдсэн` }, { status: 400 });

        let newS1 = s1, newS2 = s2;
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
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
