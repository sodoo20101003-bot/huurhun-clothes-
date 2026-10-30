import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// POS/manage хэсгээс зураг байршуулах (admin client-ээр storage RLS алгасна)
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Зураг олдсонгүй" }, { status: 400 });
    }

    const admin = createAdminClient();
    const safeName = (file.name || "image").replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error } = await admin.storage.from("products").upload(path, bytes, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const url = admin.storage.from("products").getPublicUrl(path).data.publicUrl;
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
