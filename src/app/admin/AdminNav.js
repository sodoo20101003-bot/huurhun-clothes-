"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const GROUPS = [
  { title: null, items: [
    { href: "/admin", label: "📊 Хянах самбар" },
    { href: "/admin/pos-activity", label: "🧾 POS үйлдэл" },
  ] },
  {
    title: "Борлуулалт",
    items: [
      { href: "/admin/online-orders", label: "🌐 Онлайн захиалга" },
      { href: "/admin/orders/new", label: "📝 Гараар захиалга", accent: "green" },
      { href: "/admin/kassa-history", label: "📋 Кассын түүх" },
      { href: "/admin/reports", label: "📊 Тайлан" },
      { href: "/admin/daily-payments", label: "📅 Өдөр + Төлбөр" },
      { href: "/admin/profit", label: "💰 Ашиг" },
    ],
  },
  {
    title: "Бараа & Агуулах",
    items: [
      { href: "/admin/products", label: "Бараа" },
      { href: "/admin/inventory-branches", label: "🏪 Салбар үлдэгдэл" },
      { href: "/admin/bulk-restock", label: "📦 Ачаа нэмэх" },
      { href: "/admin/restock-history", label: "📥 Ачааны түүх" },
      { href: "/admin/categories", label: "🗂 Ангилал" },
      { href: "/admin/brands", label: "🏷 Брэнд" },
    ],
  },
  {
    title: "Маркетинг",
    items: [
      { href: "/admin/banners", label: "🖼 Нүүр баннер" },
      { href: "/admin/promotions", label: "🎁 Урамшуулал" },
      { href: "/admin/bundle-promos", label: "🔗 Bundle урамшуулал" },
    ],
  },
  {
    title: "Бусад",
    items: [
      { href: "/admin/users", label: "👥 Хэрэглэгчид" },
      { href: "/admin/chat", label: "💬 Чат" },
    ],
  },
];

export default function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/");

  const activeLabel = GROUPS.flatMap((g) => g.items).find((i) => isActive(i.href))?.label || "Цэс";

  return (
    <div>
      <button onClick={() => setOpen((o) => !o)}
        className="mb-2 flex w-full items-center justify-between rounded-xl border border-ink/15 bg-paper px-4 py-3 text-sm font-semibold md:hidden">
        <span>{activeLabel}</span>
        <span className="text-ink-400">{open ? "▲" : "☰"}</span>
      </button>

      <nav className={`${open ? "block" : "hidden"} space-y-3 md:block`}>
        {GROUPS.map((g, gi) => (
          <div key={gi}>
            {g.title && <p className="px-3 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-ink-400">{g.title}</p>}
            <div className="space-y-0.5">
              {g.items.map((n) => {
                const active = isActive(n.href);
                return (
                  <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active ? "bg-ink text-cream"
                        : n.accent === "green" ? "text-green-700 hover:bg-green-50"
                        : "text-ink hover:bg-cream"
                    }`}>
                    {n.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        <Link href="/kassa" onClick={() => setOpen(false)}
          className="mt-2 block rounded-lg bg-beak px-3 py-2.5 text-center text-sm font-semibold text-ink transition hover:bg-beak-600">
          💼 Кассаар орох →
        </Link>
      </nav>
    </div>
  );
}
