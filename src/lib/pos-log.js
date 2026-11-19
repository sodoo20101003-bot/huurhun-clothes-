import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POS үйлдлийг бүртгэнэ. Нэвтэрсэн хэрэглэгчийг cookie-оос уншина (хуурамчлах боломжгүй).
export async function logPosActivity(action, data = {}) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let name = user?.email || "—";
    if (user) {
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      if (p?.full_name) name = p.full_name;
    }
    const admin = createAdminClient();
    await admin.from("pos_activity").insert({
      user_id: user?.id || null,
      user_name: name,
      action,
      branch: data.branch || null,
      detail: data.detail ? String(data.detail).slice(0, 400) : null,
      amount: data.amount != null ? Number(data.amount) : null,
      qty: data.qty != null ? Number(data.qty) : null,
    });
  } catch (e) {
    console.error("pos log error:", e.message);
  }
}
