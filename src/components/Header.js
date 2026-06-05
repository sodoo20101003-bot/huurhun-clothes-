"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { createClient } from "@/lib/supabase/client";

export default function Header() {
  const { count } = useCart();
  const [cats, setCats] = useState([]);
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("categories")
      .select("name,slug")
      .order("sort", { ascending: true })
      .then(({ data }) => setCats(data || []));
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setUser(s?.user ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 glass border-b border-ink/10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* ЛОГО */}
          <Link href="/" className="flex items-center gap-2 shrink-0 min-w-0">
            <span className="grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-ink">
              <Image src="/logo.jpg" alt="huurhun_clothes" width={40} height={40} className="object-cover" />
            </span>
            <span className="font-display text-base sm:text-lg font-700 tracking-tight truncate">huurhun</span>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex items-center gap-1">
            {cats.map((c) => (
              <Link key={c.slug} href={`/category/${c.slug}`}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-ink-400 hover:bg-ink/5 hover:text-ink transition">
                {c.name}
              </Link>
            ))}
          </nav>

          {/* ТОВЧНУУД */}
          <div className="flex items-center gap-2">
            {/* Хайлт — үргэлж харагдана */}
            <Link href="/search" className="btn-ghost !px-3 !py-2 text-sm" aria-label="Хайх">🔍</Link>
            <Link href="/favorites" className="btn-ghost !px-3 !py-2 text-sm" aria-label="Дуртай">❤️</Link>
            {/* Desktop-only: бот + профайл */}
            <Link href="/chat" className="hidden sm:inline-flex btn-ghost !px-4 !py-2 text-sm">💬 Бот</Link>
            <Link href={user ? "/profile" : "/login"} className="hidden sm:inline-flex btn-ghost !px-4 !py-2 text-sm">
              {user ? "Профайл" : "Нэвтрэх"}
            </Link>
            {/* Сагс — үргэлж харагдана */}
            <Link href="/cart" className="relative btn-primary !px-4 !py-2 text-sm">
              🛒
              {count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-beak px-1 text-xs font-bold text-ink">{count}</span>
              )}
            </Link>
            {/* Mobile menu товч */}
            <button onClick={() => setOpen(!open)} className="md:hidden btn-ghost !px-3 !py-2" aria-label="Цэс">☰</button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {open && (
          <div className="md:hidden space-y-3 pb-4">
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => (
                <Link key={c.slug} href={`/category/${c.slug}`} onClick={() => setOpen(false)} className="chip border-ink/15">
                  {c.name}
                </Link>
              ))}
            </div>
            <div className="flex gap-2">
              <Link href="/chat" onClick={() => setOpen(false)} className="btn-ghost flex-1 !py-2.5 text-sm justify-center">💬 Бот</Link>
              <Link href={user ? "/profile" : "/login"} onClick={() => setOpen(false)} className="btn-ghost flex-1 !py-2.5 text-sm justify-center">
                {user ? "Профайл" : "Нэвтрэх"}
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
