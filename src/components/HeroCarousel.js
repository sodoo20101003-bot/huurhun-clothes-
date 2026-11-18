"use client";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

const DEFAULT_SUB = "Манай хөөрхөн дэлгүүрийн албан ёсны вэбсайтад тавтай морилно уу. Загварлаг, чанартай хувцас + хурдан хүргэлт.";
const DURATION = 5000;

export default function HeroCarousel({ banners = [] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = banners.length;

  const go = useCallback((d) => setI((p) => (p + d + n) % n), [n]);

  useEffect(() => {
    if (n <= 1 || paused) return;
    const t = setInterval(() => setI((p) => (p + 1) % n), DURATION);
    return () => clearInterval(t);
  }, [n, paused]);

  if (n === 0) return null;

  const active = banners[i];
  const href = active.link || "#shop";

  return (
    <section
      className="relative w-full overflow-hidden bg-ink"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <style>{`
        @keyframes heroUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes heroZoom{from{transform:scale(1.06)}to{transform:scale(1)}}
        @keyframes heroBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        .heroUp{animation:heroUp .7s cubic-bezier(.2,.7,.2,1) both}
      `}</style>

      {/* Тогтсон өндөртэй full-width баннер */}
      <div className="relative h-[300px] sm:h-[420px] lg:h-[500px]">
        {/* Зурагнууд — crossfade */}
        {banners.map((b, idx) => (
          <Link
            key={b.id}
            href={b.link || "#shop"}
            aria-label={b.title || "Баннер"}
            tabIndex={idx === i ? 0 : -1}
            className={`absolute inset-0 block transition-opacity duration-[900ms] ease-out ${idx === i ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.image}
              alt={b.title || "banner"}
              className="h-full w-full object-cover object-center"
              style={idx === i ? { animation: "heroZoom 6s ease-out both" } : undefined}
            />
          </Link>
        ))}

        {/* Градиент давхарга */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(95deg,rgba(40,53,80,.96)_0%,rgba(40,53,80,.78)_26%,rgba(40,53,80,.32)_55%,rgba(40,53,80,0)_82%)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />

        {/* Бичиг — хуудасны контенттэй эгнэнэ (max-w-6xl) */}
        <div className="pointer-events-none absolute inset-0">
          <div className="mx-auto flex h-full max-w-6xl items-center px-5 sm:px-8 lg:px-10">
            <div key={i} className="max-w-md text-cream sm:max-w-lg">
              <span className="heroUp hidden items-center gap-1.5 rounded-full bg-cream/10 px-3 py-1 text-xs font-medium text-cream/90 ring-1 ring-cream/15 backdrop-blur sm:inline-flex" style={{ animationDelay: "60ms" }}>
                <span className="text-beak">★</span> Албан ёсны сайт
              </span>
              <h2 className="heroUp font-display font-800 leading-[1.04] tracking-tight text-[1.6rem] [text-shadow:0_2px_20px_rgba(0,0,0,.3)] sm:mt-4 sm:text-4xl lg:text-5xl" style={{ animationDelay: "140ms" }}>
                {active.title || "Тавтай морил!"}
                <span className="block text-beak">huurhun_clothes</span>
              </h2>
              <p className="heroUp mt-2 hidden max-w-md text-sm text-cream/85 sm:block lg:text-[15px]" style={{ animationDelay: "220ms" }}>
                {active.subtitle || DEFAULT_SUB}
              </p>
              <div className="heroUp" style={{ animationDelay: "300ms" }}>
                <Link
                  href={href}
                  className="pointer-events-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-beak px-4 py-2 text-sm font-semibold text-ink shadow-lg shadow-beak/25 transition hover:bg-beak-600 hover:gap-2.5 sm:mt-6 sm:px-6 sm:py-3"
                >
                  Дэлгүүр үзэх <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Удирдлага */}
        {n > 1 && (
          <div className="absolute bottom-3 right-3 z-20 flex flex-col items-end gap-2.5 sm:bottom-6 sm:right-8">
            <div className="hidden gap-2 sm:flex">
              <button onClick={() => go(-1)} aria-label="Өмнөх"
                className="grid h-11 w-11 place-items-center rounded-full bg-cream/10 text-xl text-cream ring-1 ring-cream/25 backdrop-blur transition hover:bg-cream/20 hover:ring-cream/50">‹</button>
              <button onClick={() => go(1)} aria-label="Дараах"
                className="grid h-11 w-11 place-items-center rounded-full bg-cream/10 text-xl text-cream ring-1 ring-cream/25 backdrop-blur transition hover:bg-cream/20 hover:ring-cream/50">›</button>
            </div>
            <div className="flex items-center gap-1.5">
              {banners.map((_, idx) => (
                <button key={idx} onClick={() => setI(idx)} aria-label={`${idx + 1}-р баннер`}
                  className={`h-1.5 overflow-hidden rounded-full bg-cream/35 transition-all duration-300 ${idx === i ? "w-9" : "w-1.5 hover:bg-cream/60"}`}>
                  {idx === i && (
                    <span key={i} className="block h-full w-full origin-left rounded-full bg-beak"
                      style={{ animation: `heroBar ${DURATION}ms linear both`, animationPlayState: paused ? "paused" : "running" }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
