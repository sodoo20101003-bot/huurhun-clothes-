import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { productId, productName, size, color, qty, note, branch } = await request.json();
    if (!productId || !qty) return NextResponse.json({ error: "productId, qty заавал" }, { status: 400 });

    const admin = createAdminClient();
    const targetBranch = branch === "branch2" ? "branch2" : "branch1";
    const stockColumn = targetBranch === "branch2" ? "stock_branch2" : "stock";

    // Variant олох
    let q = admin.from("product_variants").select(`id,stock,stock_branch2`).eq("product_id", productId);
    if (size) q = q.eq("size", size); else q = q.is("size", null);
    if (color) q = q.eq("color", color); else q = q.is("color", null);
    const { data: variants, error: vErr } = await q;
    if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });
    if (!variants?.length) return NextResponse.json({ error: "Variant олдсонгүй" }, { status: 404 });

    const v = variants[0];
    const currentStock = Number(v[stockColumn] || 0);
    const newStock = currentStock + Number(qty);

    // Стокийг шинэчлэх
    const updatePayload = { [stockColumn]: newStock };
    const { error: uErr } = await admin
      .from("product_variants")
      .update(updatePayload)
      .eq("id", v.id);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    // Restock log
    await admin.from("restock_logs").insert({
      product_id: productId,
      product_name: productName || "—",
      size: size || null,
      color: color || null,
      qty: Number(qty),
      note: note ? `[${targetBranch === "branch1" ? "С1" : "С2"}] ${note}` : `[${targetBranch === "branch1" ? "С1" : "С2"}]`,
    });

    return NextResponse.json({ ok: true, newStock, branch: targetBranch });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
