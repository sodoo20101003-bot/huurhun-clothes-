import Link from "next/link";

const NAV = [
  { href: "/admin", label: "Хянах самбар" },
  { href: "/admin/products", label: "Бараа" },
  { href: "/admin/categories", label: "Ангилал" },
  { href: "/admin/promotions", label: "Урамшуулал" },
  { href: "/admin/orders", label: "Захиалга" },
  { href: "/admin/reports", label: "📊 Тайлан" },
  { href: "/admin/chat", label: "💬 Чат" },
];

export default function AdminLayout({ children }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-700">Админ</h1>
        <Link href="/" className="text-sm text-ink-400 hover:text-beak-600">← Дэлгүүр рүү</Link>
      </div>
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <nav className="flex flex-row gap-2 overflow-x-auto md:flex-col">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="chip whitespace-nowrap border-ink/15 hover:border-ink/40">
              {n.label}
            </Link>
          ))}
        </nav>
        <div>{children}</div>
      </div>
    </div>
  );
}
