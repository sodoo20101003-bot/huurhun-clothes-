import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// StorePay webhook — төлбөр төлсөн үед StorePay энэ URL-ыг GET хүсэлтээр дуудна
// URL: /api/storepay/callback?order_code=XXXXXX&id=loanId
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const order_code = searchParams.get("order_code");
    const loanId = searchParams.get("id");

    if (!order_code) return NextResponse.json({ error: "order_code хэрэгтэй" }, { status: 400 });

    const admin = createAdminClient();
    const { data: order } = await admin.from("orders")
      .select("*").eq("order_code", order_code).single();

    if (!order) return NextResponse.json({ error: "Захиалга олдсонгүй" }, { status: 404 });

    // Аль хэдийн paid бол хэвээр
    if (order.payment_status === "paid") {
      return NextResponse.json({ ok: true, already_paid: true });
    }

    // Order-ыг paid болгох
    await admin.from("orders")
      .update({ payment_status: "paid", status: "pending" })
      .eq("order_code", order_code);

    // Stock хасах + sales бичих
    const items = Array.isArray(order.items) ? order.items : [];
    const targetBranch = "branch1";

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
        const qty = Number(it.qty);
        let newS1 = s1, newS2 = s2;
        if (qty <= s1) newS1 = s1 - qty;
        else { newS1 = 0; newS2 = Math.max(0, s2 - (qty - s1)); }
        await admin.from("product_variants")
          .update({ stock_branch1: newS1, stock_branch2: newS2, stock: newS1 + newS2 })
          .eq("id", v.id);
      }
    }

    const salesRows = items.map((it) => ({
      product_id: it.productId || null,
      product_name: it.productName,
      size: it.size || null,
      color: it.color || null,
      qty: Number(it.qty || 1),
      unit_price: Number(it.unitPrice),
      total: Number(it.unitPrice) * Number(it.qty),
      channel: "web",
      payment_method: "storepay",
      branch: targetBranch,
      order_code,
      is_manual: false,
    }));
    await admin.from("sales").insert(salesRows);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  // StorePay зарим үед POST хүсэлт илгээж болзошгүй
  return GET(request);
}
