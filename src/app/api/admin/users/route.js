import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Нэвтрээгүй", status: 401 };
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return { error: "Зөвхөн админ", status: 403 };
  return { ok: true };
}

// Бүх хэрэглэгчийг жагсаах (RLS алгасан — зөвхөн админд)
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id,email,full_name,is_admin,is_cashier,created_at")
    .order("created_at", { ascending: false })
    .range(0, 100000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data || [] });
}

// Эрх солих (is_cashier / is_admin)
export async function POST(request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { userId, field, value } = await request.json();
  if (!userId || !["is_cashier", "is_admin"].includes(field)) {
    return NextResponse.json({ error: "Буруу хүсэлт" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ [field]: !!value }).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
