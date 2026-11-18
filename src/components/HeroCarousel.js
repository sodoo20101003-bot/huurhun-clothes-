"use client";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

export default function HeroCarousel({ banners = [] }) {
  const [i, setI] = useState(0);
  const n = banners.length;

  const go = useCallback((d) => setI((p) => (p + d + n) % n), [n]);

  useEffect(() => {
    if (n <= 1) return;
    const t = setInterval(() => setI((p) => (p + 1) % n), 5500);
    return () => clearInterval(t);
  }, [n]);

  if (n === 0) return null;

  return (
    <section className="relative overflow-hidden bg-ink">
      <div className="relative mx-auto max-w-6xl px-4 py-4 md:py-6">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl sm:aspect-[21/9] md:aspect-[24/9]">
          {banners.map((b, idx) => (
            <div
              key={b.id}
              className={`absolute inset-0 transition-opacity duration-700 ${idx === i ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.image} alt={b.title || "banner"} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/40 to-transparent" />

              <div className="absolute inset-0 flex items-center">
                <div className="max-w-md px-6 sm:px-10 text-cream">
                  {(b.title || b.subtitle) && (
                    <>
                      {b.title && (
                        <h2 className="font-display text-2xl font-800 leading-tight tracking-tight sm:text-4xl md:text-5xl">
                          {b.title}
                        </h2>
                      )}
                      {b.subtitle && (
                        <p className="mt-3 max-w-sm text-sm text-cream/80 sm:text-base">{b.subtitle}</p>
                      )}
                      <Link href={b.link || "#shop"} className="btn-accent mt-5 !py-2.5 sm:mt-6">
                        Дэлгүүр үзэх →
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Сум */}
          {n > 1 && (
            <>
              <button onClick={() => go(-1)} aria-label="Өмнөх"
                className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-paper/80 text-ink backdrop-blur transition hover:bg-paper">‹</button>
              <button onClick={() => go(1)} aria-label="Дараах"
                className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-paper/80 text-ink backdrop-blur transition hover:bg-paper">›</button>
              {/* Цэгүүд */}
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {banners.map((_, idx) => (
                  <button key={idx} onClick={() => setI(idx)} aria-label={`${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-cream" : "w-1.5 bg-cream/50"}`} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
