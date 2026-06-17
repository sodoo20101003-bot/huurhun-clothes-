import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOut from "../profile/SignOut";
import Link from "next/link";

export default async function KassaLayout({ children }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/kassa");
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin,is_cashier,full_name,email")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin && !profile?.is_cashier) redirect("/");

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-700">💼 Касс</h1>
          <span className="text-xs text-ink-400">{profile.full_name || profile.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="text-sm text-ink-400 hover:text-ink">← Дэлгүүр рүү</Link>
          <SignOut />
        </div>
      </div>
      {children}
    </div>
  );
}
