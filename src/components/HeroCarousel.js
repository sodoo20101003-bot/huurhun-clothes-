"use client";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

const DEFAULT_SUB = "Манай хөөрхөн дэлгүүр ирийн та бүхэнд хамгийн сайн чанартай хувцас, обувь, аксессуарыг санал болгож байна.";

export default function HeroCarousel({ banners = [] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = banners.length;

  const go = useCallback((d) => setI((p) => (p + d + n) % n), [n]);

  useEffect(() => {
    if (n <= 1 || paused) return;
    const t = setInterval(() => setI((p) => (p + 1) % n), 5500);
    return () => clearInterval(t);
  }, [n, paused]);

  if (n === 0) return null;

  return (
    <section className="mx-auto max-w-[1400px] px-3 pt-3 sm:px-4 sm:pt-4">
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-ink shadow-sm sm:aspect-[21/9] lg:aspect-[7/2]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {banners.map((b, idx) => {
          const href = b.link || "#shop";
          const active = idx === i;
          return (
            <div
              key={b.id}
              className={`absolute inset-0 transition-opacity duration-700 ${active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
            >
              {/* Зураг бүхэлдээ дарагдана → бараа руу */}
              <Link href={href} className="absolute inset-0" aria-label={b.title || "Баннер"}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image} alt={b.title || "banner"} className="h-full w-full object-cover object-right" />
                <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/60 to-transparent sm:via-ink/45" />
              </Link>

              {/* Бичиг (зүүн тал) */}
              <div className="pointer-events-none absolute inset-0 flex items-center">
                <div className="w-full max-w-xl px-5 sm:px-10 lg:px-16 text-cream">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-cream/10 px-3 py-1 text-[11px] font-medium text-cream/90 backdrop-blur sm:text-xs">
                    <span className="text-beak">★</span> Албан ёсны сайт
                  </span>
                  <h2 className="mt-3 font-display font-800 leading-[1.05] tracking-tight text-[1.75rem] sm:mt-4 sm:text-4xl lg:text-5xl">
                    {b.title || "Тавтай морил!"}
                    <span className="block text-beak">huurhun_clothes</span>
                  </h2>
                  <p className="mt-3 hidden max-w-md text-sm text-cream/80 sm:block lg:text-[15px]">
                    {b.subtitle || DEFAULT_SUB}
                  </p>
                  <Link
                    href={href}
                    className="pointer-events-auto btn-accent mt-4 !px-5 !py-2.5 text-sm sm:mt-6"
                  >
                    Дэлгүүр үзэх →
                  </Link>
                </div>
              </div>
            </div>
          );
        })}

        {/* Сум + цэгүүд (баруун доод) */}
        {n > 1 && (
          <div className="absolute bottom-3 right-3 z-20 flex flex-col items-end gap-2.5 sm:bottom-6 sm:right-6">
            <div className="flex gap-2">
              <button onClick={() => go(-1)} aria-label="Өмнөх"
                className="grid h-9 w-9 place-items-center rounded-full bg-ink/90 text-lg text-cream shadow transition hover:bg-ink sm:h-11 sm:w-11">‹</button>
              <button onClick={() => go(1)} aria-label="Дараах"
                className="grid h-9 w-9 place-items-center rounded-full bg-ink/90 text-lg text-cream shadow transition hover:bg-ink sm:h-11 sm:w-11">›</button>
            </div>
            <div className="flex gap-1.5 pr-1">
              {banners.map((_, idx) => (
                <button key={idx} onClick={() => setI(idx)} aria-label={`${idx + 1}-р баннер`}
                  className={`h-2 rounded-full transition-all ${idx === i ? "w-2 bg-beak" : "w-2 bg-cream/70 hover:bg-cream"}`} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
