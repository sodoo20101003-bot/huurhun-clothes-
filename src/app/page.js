import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: cats }, { data: newest }, { data: deals }, { data: promos }, { data: allProducts }] =
    await Promise.all([
      supabase.from("categories").select("name,slug,image").order("sort").limit(8),
      supabase.from("products").select("*").gte("created_at", sevenDaysAgo).order("created_at", { ascending: false }).limit(8),
      supabase.from("products").select("*").gt("discount_percent", 0).order("discount_percent", { ascending: false }).limit(4),
      supabase.from("promotions").select("*").eq("active", true).limit(4),
      supabase.from("products").select("*").order("created_at", { ascending: false }).limit(8),
    ]);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden bg-ink text-cream">
        <div className="absolute inset-0 dot-grid opacity-30" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 md:grid-cols-2 md:py-24">
          <div className="rise">
            <span className="inline-flex rounded-full bg-beak/20 px-3 py-1 text-sm font-semibold text-beak">
              🦆 Албан ёсны сайт
            </span>
            <h1 className="mt-5 font-display text-4xl font-700 leading-tight md:text-6xl">
              Тавтай морил!<br />
              <span className="text-beak">huurhun_clothes</span>
            </h1>
            <p className="mt-5 max-w-md text-cream/75">
              Манай хөөрхөн дэлгүүрийн албан ёсны вэбсайтад тавтай морилно уу.
              Загварлаг, чанартай хувцас + хурдан хүргэлт.
            </p>
            <div className="mt-8 flex gap-3">
              <Link href="#shop" className="btn-accent">Дэлгүүр үзэх</Link>
              {promos?.length > 0 && (
                <Link href="#promo" className="btn-ghost !bg-transparent !text-cream !border-cream/30">
                  Урамшуулал
                </Link>
              )}
            </div>
          </div>
          <div className="relative mx-auto grid h-64 w-64 place-items-center rounded-full bg-cream/5 md:h-80 md:w-80">
            <div className="absolute inset-4 rounded-full border border-cream/15" />
            <Image src="/logo.jpg" alt="huurhun_clothes" width={320} height={320} className="h-48 w-48 rounded-full object-cover md:h-60 md:w-60" priority />
          </div>
        </div>
      </section>

      {/* PROMOS (1+1, 1 загвар + цүнх г.м.) */}
      {promos?.length > 0 && (
        <section id="promo" className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="font-display text-2xl font-700 mb-5">🎁 Урамшуулал</h2>
          <div className={`grid gap-4 ${promos.length === 1 ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}>
            {promos.map((p) => (
              <div key={p.id} className="card overflow-hidden border border-beak/30 bg-beak-100">
                {p.image && (
                  <div className="aspect-[16/9] overflow-hidden bg-cream">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-4 p-5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-beak font-display text-base font-700 text-ink">
                    {p.badge || "%"}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display font-600 truncate">{p.title}</h3>
                    {p.description && <p className="text-sm text-ink-400 line-clamp-2">{p.description}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CATEGORIES */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="font-display text-2xl font-700">Ангилал</h2>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {(cats || []).map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`} className="group card relative aspect-[4/3] overflow-hidden">
              {c.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt={c.name} className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105" />
              ) : (
                <div className="absolute inset-0 dot-grid bg-cream" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
              <span className="absolute bottom-3 left-4 font-display text-lg font-600 text-cream">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* DEALS */}
      {deals?.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-700">🔥 Хямдрал</h2>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {deals.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* NEWEST — зөвхөн 7 хоногийн дотор нэмэгдсэн бараанууд */}
      {newest && newest.length > 0 && (
        <section id="shop" className="mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-700">✨ Шинэ бараа</h2>
            <span className="text-xs text-ink-400">сүүлийн 7 хоног</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {newest.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* БҮХ БАРАА */}
      {allProducts && allProducts.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <h2 className="font-display text-2xl font-700">Бүх бараа</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {allProducts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
