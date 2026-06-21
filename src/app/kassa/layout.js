import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function KassaLayout({ children }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Хэрэв нэвтрээгүй бол → /login руу үсэргэх (хооход буцахгүй)
  if (!user) redirect("/login?next=/kassa");

  // Profile-ийн эрх шалгах
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin,is_cashier,full_name")
    .eq("id", user.id)
    .single();

  // Хэрэв касс ч биш, админ ч биш → /login руу үсэргэж "kass@gmail.com шаардлагатай" гэх мессеж
  if (!profile?.is_admin && !profile?.is_cashier) {
    redirect("/login?next=/kassa&err=Касс+ажилтны+эрх+шаардлагатай");
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="bg-ink text-cream px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="hover:underline">← Дэлгүүр</Link>
          <span className="opacity-50">|</span>
          <span>💼 {profile?.full_name || user.email}</span>
          {profile?.is_admin && <span className="text-beak text-xs">(админ)</span>}
        </div>
        <form action="/api/auth/signout" method="post">
          <button className="text-xs opacity-70 hover:opacity-100">Гарах →</button>
        </form>
      </div>
      <div className="p-3">
        {children}
      </div>
    </div>
  );
}
