import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logPosActivity } from "@/lib/pos-log";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { productId, productName, size, color, qty, note, branch } = await request.json();
    if (!productId || !qty) return NextResponse.json({ error: "productId, qty заавал" }, { status: 400 });

    const admin = createAdminClient();
    const targetBranch = branch === "branch2" ? "branch2" : "branch1";
    const addQty = Number(qty);

    // Variant олох
    let q = admin.from("product_variants").select("id,stock_branch1,stock_branch2").eq("product_id", productId);
    if (size) q = q.eq("size", size); else q = q.is("size", null);
    if (color) q = q.eq("color", color); else q = q.is("color", null);
    const { data: variants, error: vErr } = await q;
    if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });
    if (!variants?.length) return NextResponse.json({ error: "Variant олдсонгүй" }, { status: 404 });

    const v = variants[0];

    // 1) АТОМААР нэмэх (race-safe). Функц байхгүй бол fallback.
    const { error: rpcErr } = await admin.rpc("increment_variant_stock", {
      p_variant_id: v.id,
      p_branch: targetBranch,
      p_qty: addQty,
    });

    if (rpcErr) {
      // Fallback: функц суулгаагүй үед хуучин арга (атом биш).
      // Хамгийн шинэ утгыг дахин уншаад бичнэ (race-ийн цонхыг багасгана).
      const { data: fresh } = await admin
        .from("product_variants")
        .select("stock_branch1,stock_branch2")
        .eq("id", v.id)
        .single();
      const s1 = Number(fresh?.stock_branch1 || 0);
      const s2 = Number(fresh?.stock_branch2 || 0);
      const payload = targetBranch === "branch2"
        ? { stock_branch2: s2 + addQty, stock: s1 + s2 + addQty }
        : { stock_branch1: s1 + addQty, stock: s1 + s2 + addQty };
      const { error: uErr } = await admin.from("product_variants").update(payload).eq("id", v.id);
      if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    }

    // Restock log (алдаа гарвал ачаа нэмэгдсэн хэвээр)
    await admin.from("restock_logs").insert({
      product_id: productId,
      product_name: productName || "—",
      size: size || null,
      color: color || null,
      qty: addQty,
      note: note ? `[${targetBranch === "branch1" ? "С1" : "С2"}] ${note}` : `[${targetBranch === "branch1" ? "С1" : "С2"}]`,
    });

    await logPosActivity("restock", {
      branch: targetBranch,
      qty: addQty,
      detail: `${productName || "—"}${size || color ? ` (${[size, color].filter(Boolean).join("/")})` : ""}`,
    });

    return NextResponse.json({ ok: true, branch: targetBranch });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
