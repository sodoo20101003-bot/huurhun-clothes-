import { createClient } from "@/lib/supabase/server";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }) {
  const q = (searchParams?.q || "").trim();
  const supabase = createClient();

  let products = [];
  if (q) {
    // Нэр + тайлбараар хайна (case-insensitive)
    const { data } = await supabase
      .from("products")
      .select("*, categories(name)")
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(50);
    products = data || [];
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-700 mb-2">🔍 Хайлт</h1>

      {/* Хайлтын талбар */}
      <form action="/search" method="GET" className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Бараа хайх..."
            className="input flex-1"
            autoFocus
          />
          <button type="submit" className="btn-accent">Хайх</button>
        </div>
      </form>

      {/* Үр дүн */}
      {q ? (
        <>
          <p className="text-sm text-ink-400 mb-4">
            "{q}" — <b>{products.length}</b> үр дүн
          </p>
          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="card p-10 text-center">
              <p className="text-ink-400">Үр дүн олдсонгүй 😕</p>
              <Link href="/" className="btn-accent mt-4 inline-block">Дэлгүүр үзэх</Link>
            </div>
          )}
        </>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-ink-400">Бараа хайхын тулд нэр оруулна уу</p>
        </div>
      )}
    </div>
  );
}
