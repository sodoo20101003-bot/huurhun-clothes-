"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Бүх хуудсанд харагдах хөвөгч чат товч
// Зөвхөн /livechat болон /admin/* хуудсанд харагдахгүй
export default function LiveChatBubble() {
  const pathname = usePathname();
  if (pathname?.startsWith("/livechat") || pathname?.startsWith("/admin")) return null;

  return (
    <Link
      href="/livechat"
      className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-ink text-cream shadow-soft hover:scale-110 transition"
      aria-label="Шууд чат"
      title="Шууд чат"
    >
      <span className="text-2xl">💬</span>
    </Link>
  );
}
