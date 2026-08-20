import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ADMIN_PASSWORD = "huurhun2026";

export async function POST(request) {
  try {
    const { order_code, password } = await request.json();
    if (!order_code) return NextResponse.json({ error: "order_code required" }, { status: 400 });
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Нууц үг буруу" }, { status: 403 });
    }

    const admin = createAdminClient();

    // 1. Энэ order_code-той бүх sales олох
    const { data: sales, error: salesErr } = await admin
      .from("sales")
      .select("*")
      .eq("order_code", order_code);

    if (salesErr) return NextResponse.json({ error: salesErr.message }, { status: 500 });
    if (!sales?.length) return NextResponse.json({ error: "Зарагдалт олдсонгүй" }, { status: 404 });

    // 2. Үлдэгдэл буцаах (зөвхөн product_id-тай зүйлүүд)
    let restored = 0;
    for (const s of sales) {
      if (!s.product_id) continue;
      let q = admin.from("product_variants").select("id,stock_branch1,stock_branch2").eq("product_id", s.product_id);
      if (s.size) q = q.eq("size", s.size); else q = q.is("size", null);
      if (s.color) q = q.eq("color", s.color); else q = q.is("color", null);
      const { data: variants } = await q;
      if (variants?.length) {
        const v = variants[0];
        const s1 = Number(v.stock_branch1 || 0);
        const s2 = Number(v.stock_branch2 || 0);
        // Зарагдсан салбарт нь буцаана (branch2 бол С2, бусад бүх тохиолдолд С1)
        const newS1 = s.branch === "branch2" ? s1 : s1 + Number(s.qty);
        const newS2 = s.branch === "branch2" ? s2 + Number(s.qty) : s2;
        await admin
          .from("product_variants")
          .update({ stock_branch1: newS1, stock_branch2: newS2, stock: newS1 + newS2 })
          .eq("id", v.id);
        restored += Number(s.qty);
      }
    }

    // 3. Sales мөрүүдийг устгах
    const { error: delErr } = await admin
      .from("sales")
      .delete()
      .eq("order_code", order_code);

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      deleted_count: sales.length,
      restored_qty: restored,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
