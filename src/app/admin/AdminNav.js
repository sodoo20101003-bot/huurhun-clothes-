"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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
      { href: "/admin/products", label: "📦 Бараа & үлдэгдэл" },
      { href: "/admin/bulk-restock", label: "📥 Ачаа нэмэх" },
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
  const [unreadChat, setUnreadChat] = useState(0);
  const baseTitle = useRef(null);

  // Уншаагүй чатын тоо — real-time
  useEffect(() => {
    const supabase = createClient();
    let channel;
    async function refresh() {
      try {
        const { data } = await supabase.from("chat_sessions").select("unread_by_admin");
        const total = (data || []).reduce((s, x) => s + Number(x.unread_by_admin || 0), 0);
        setUnreadChat(total);
      } catch {}
    }
    refresh();
    try {
      channel = supabase
        .channel("admin-chat-notify")
        .on("postgres_changes", { event: "*", schema: "public", table: "chat_sessions" }, refresh)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, refresh)
        .subscribe();
    } catch {}
    const poll = setInterval(refresh, 20000);
    return () => {
      clearInterval(poll);
      if (channel) try { supabase.removeChannel(channel); } catch {}
    };
  }, []);

  // Таб гарчигт мэдэгдэл
  useEffect(() => {
    if (baseTitle.current == null) baseTitle.current = document.title.replace(/^\(\d+\)\s*/, "") || "Админ";
    document.title = unreadChat > 0 ? `(${unreadChat}) 💬 ${baseTitle.current}` : baseTitle.current;
  }, [unreadChat]);

  const isActive = (href) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/");

  const activeLabel = GROUPS.flatMap((g) => g.items).find((i) => isActive(i.href))?.label || "Цэс";

  return (
    <div>
      <button onClick={() => setOpen((o) => !o)}
        className="mb-2 flex w-full items-center justify-between rounded-xl border border-ink/15 bg-paper px-4 py-3 text-sm font-semibold md:hidden">
        <span className="flex items-center gap-2">
          {activeLabel}
          {unreadChat > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">{unreadChat}</span>}
        </span>
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
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active ? "bg-ink text-cream"
                        : n.accent === "green" ? "text-green-700 hover:bg-green-50"
                        : "text-ink hover:bg-cream"
                    }`}>
                    <span>{n.label}</span>
                    {n.href === "/admin/chat" && unreadChat > 0 && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white animate-pulse">{unreadChat}</span>
                    )}
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
