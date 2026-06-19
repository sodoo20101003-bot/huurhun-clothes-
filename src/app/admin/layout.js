import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOut from "../profile/SignOut";

const NAV = [
  { href: "/admin", label: "Хянах самбар" },
  { href: "/admin/products", label: "Бараа" },
  { href: "/admin/restock-history", label: "📥 Ачааны түүх" },
  { href: "/admin/categories", label: "🗂 Ангилал" },
  { href: "/admin/brands", label: "🏷 Брэнд" },
  { href: "/admin/promotions", label: "Урамшуулал" },
  { href: "/admin/orders", label: "Захиалга" },
  { href: "/admin/orders/new", label: "📝 Гараар захиалга" },
  { href: "/admin/kassa-history", label: "📋 Кассын түүх" },
  { href: "/admin/reports", label: "📊 Тайлан" },
  { href: "/admin/users", label: "👥 Хэрэглэгчид" },
  { href: "/admin/chat", label: "💬 Чат" },
  { href: "/kassa", label: "💼 Кассаар орох →" },
];

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
      <div className="grid gap-4 md:grid-cols-[200px_1fr]">
        <aside className="space-y-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={`block rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-cream transition ${
                n.href === "/kassa" ? "bg-beak text-ink mt-3" : ""
              } ${n.href === "/admin/orders/new" ? "bg-green-50 text-green-700 border border-green-200" : ""}`}
            >
              {n.label}
            </Link>
          ))}
          <SignOut />
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
