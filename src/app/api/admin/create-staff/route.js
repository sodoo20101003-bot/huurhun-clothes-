import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    // 1) Дуудаж буй хүн админ мөн эсэхийг шалгах
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Нэвтрээгүй" }, { status: 401 });
    const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!me?.is_admin) return NextResponse.json({ error: "Зөвхөн админ" }, { status: 403 });

    const { email, password, name } = await request.json();
    if (!email || !password) return NextResponse.json({ error: "Имэйл болон нууц үг заавал" }, { status: 400 });
    if (String(password).length < 6) return NextResponse.json({ error: "Нууц үг дор хаяж 6 тэмдэгт" }, { status: 400 });

    const admin = createAdminClient();

    // 2) Аккаунт үүсгэх (имэйл баталгаажуулалтгүй — шууд нэвтэрнэ)
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: String(email).trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: name || null },
    });
    if (cErr) {
      const msg = /already|exists|registered/i.test(cErr.message)
        ? "Энэ имэйл бүртгэлтэй байна"
        : cErr.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // 3) Profile-д касс эрх + нэр тавих
    const uid = created.user.id;
    await admin.from("profiles").upsert({
      id: uid,
      email: String(email).trim().toLowerCase(),
      full_name: name || null,
      is_cashier: true,
    }, { onConflict: "id" });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
