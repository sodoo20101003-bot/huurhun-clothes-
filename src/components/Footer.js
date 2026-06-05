import Link from "next/link";

// 2 салбарын байршил (Google Maps холбоос)
const BRANCHES = [
  { name: "1-р салбар", map: "https://maps.app.goo.gl/kgp3AKXBrZj4RjLP6" },
  { name: "2-р салбар", map: "https://maps.app.goo.gl/CT3S6ZRmcQW24Mcp9" },
];

const PHONE = "+976 8522 9940";
const INSTAGRAM = "https://www.instagram.com/huurhun_clothes?igsh=MTMyNXZ1bnhqczg3eA=="; // huurhun_clothes
const DEVELOPER = "https://www.instagram.com/sodo_1003?igsh=MXh3YXFta3plNGF0aQ%3D%3D&utm_source=qr";

function InstagramIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.6" cy="6.4" r="1.2" fill="currentColor" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="mt-20 bg-ink text-cream">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <div className="font-display text-xl sm:text-2xl font-700">huurhun_clothes</div>
            <p className="mt-3 max-w-xs text-sm text-cream/70">
              Хос цамц, гутал, бомбер, подволк — хөөрхөн загварлаг хувцасны онлайн дэлгүүр.
            </p>
          </div>

          <div>
            <h4 className="font-display text-sm uppercase tracking-wider text-beak">Холбоо барих</h4>
            <ul className="mt-4 space-y-3 text-sm text-cream/85">
              <li>
                Утас:{" "}
                <a href={`tel:${PHONE.replace(/\s/g, "")}`} className="hover:text-beak">
                  {PHONE}
                </a>
              </li>
              <li>
                <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-beak">
                  <InstagramIcon className="h-5 w-5" />
                  @huurhun_clothes
                </a>
              </li>
              <li>
                <a href="/chat" className="hover:text-beak">
                  💬 Захиалга шалгах
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm uppercase tracking-wider text-beak">Салбарууд</h4>
            <ul className="mt-4 space-y-3 text-sm text-cream/85">
              {BRANCHES.map((b) => (
                <li key={b.name}>
                  <a href={b.map} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-beak">
                    📍 {b.name} — байршил харах
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-cream/15 pt-6 text-xs text-cream/55 sm:flex-row">
          <span>© {new Date().getFullYear()} huurhun_clothes. Бүх эрх хуулиар хамгаалагдсан.</span>
          <div className="flex items-center gap-4">
            <a
              href={DEVELOPER}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-beak transition"
            >
              <InstagramIcon className="h-4 w-4" />
              Developer: @sodo_1003
            </a>
            <Link href="/admin" className="hover:text-beak">Админ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
