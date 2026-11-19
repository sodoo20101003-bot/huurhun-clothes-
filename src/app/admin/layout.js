import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOut from "../profile/SignOut";
import AdminNav from "./AdminNav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({ children }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/");
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-700">Админ</h1>
        <Link href="/" className="text-sm text-ink-400 hover:text-ink">← Дэлгүүр рүү</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-[210px_1fr]">
        <aside className="md:sticky md:top-4 md:self-start">
          <AdminNav />
          <div className="mt-2 hidden md:block">
            <SignOut />
          </div>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
