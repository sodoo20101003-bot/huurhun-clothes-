import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 bg-ink text-cream/70">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="font-display text-xl font-700 text-cream">huurhun_clothes</p>
            <p className="mt-2 text-sm">Манай хөөрхөн дэлгүүрийн албан ёсны вэбсайт</p>
          </div>
          <div className="text-sm space-y-2">
            <p className="font-semibold text-cream">📞 Холбоо барих</p>
            <p>📱 +976 8522 9940</p>
            <p>📷 Instagram: <a href="https://instagram.com/huurhun_clothes" className="hover:text-beak" target="_blank" rel="noreferrer">@huurhun_clothes</a></p>
          </div>
          <div className="text-sm space-y-2">
            <p className="font-semibold text-cream">🛍 Дэлгүүр</p>
            <Link href="/" className="block hover:text-beak">Нүүр хуудас</Link>
            <Link href="/search" className="block hover:text-beak">Бараа хайх</Link>
            <Link href="/favorites" className="block hover:text-beak">Дуртай</Link>
          </div>
        </div>

        <div className="mt-8 border-t border-cream/10 pt-5 flex flex-wrap items-center justify-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            📷 Developer: <a href="https://instagram.com/sodo_1003" className="hover:text-beak" target="_blank" rel="noreferrer">@sodo_1003</a>
          </span>
          <span className="opacity-30">·</span>
          <Link href="/admin" className="hover:text-beak">Админ</Link>
          <span className="opacity-30">·</span>
          <Link href="/kassa" className="hover:text-beak">💼 POS</Link>
        </div>
      </div>
    </footer>
  );
}
