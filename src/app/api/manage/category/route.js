import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// POS/manage хэсгээс ангилал нэмэх (admin client-ээр RLS алгасна)
export async function POST(request) {
  try {
    const { name, slug } = await request.json();
    if (!name) return NextResponse.json({ error: "Ангиллын нэр заавал" }, { status: 400 });

    const admin = createAdminClient();
    const { error } = await admin.from("categories").insert({
      name: String(name).trim(),
      slug: slug || String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `cat-${Date.now()}`,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
