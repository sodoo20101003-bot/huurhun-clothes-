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
        className="relative grid w-full overflow-hidden rounded-2xl bg-ink shadow-sm"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {banners.map((b, idx) => {
          const href = b.link || "#shop";
          const active = idx === i;
          return (
            <div
              key={b.id}
              className={`relative [grid-area:1/1] transition-opacity duration-700 ${active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
            >
              {/* Зураг бүхэлдээ дарагдана → бараа руу */}
              <Link href={href} className="relative block" aria-label={b.title || "Баннер"}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image} alt={b.title || "banner"} className="block h-auto w-full" />
                <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/60 to-transparent sm:via-ink/45" />
              </Link>

              {/* Бичиг (зүүн тал) */}
              <div className="pointer-events-none absolute inset-0 flex items-center">
                <div className="w-full max-w-xl px-4 sm:px-10 lg:px-16 text-cream">
                  <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-cream/10 px-3 py-1 text-xs font-medium text-cream/90 backdrop-blur">
                    <span className="text-beak">★</span> Албан ёсны сайт
                  </span>
                  <h2 className="font-display font-800 leading-[1.05] tracking-tight text-lg sm:mt-4 sm:text-3xl lg:text-5xl">
                    {b.title || "Тавтай морил!"}
                    <span className="block text-beak">huurhun_clothes</span>
                  </h2>
                  <p className="mt-3 hidden max-w-md text-sm text-cream/80 sm:block lg:text-[15px]">
                    {b.subtitle || DEFAULT_SUB}
                  </p>
                  <Link
                    href={href}
                    className="pointer-events-auto btn-accent mt-2 !px-3 !py-1.5 text-xs sm:mt-6 sm:!px-5 sm:!py-2.5 sm:text-sm"
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
          <div className="absolute bottom-2 right-3 z-20 flex flex-col items-end gap-2.5 sm:bottom-6 sm:right-6">
            <div className="hidden gap-2 sm:flex">
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
