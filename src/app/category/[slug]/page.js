"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";

export default function CategoryPage() {
  const params = useParams();
  const supabase = createClient();
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBrand, setActiveBrand] = useState("all");

  useEffect(() => {
    async function load() {
      const slug = params?.slug;
      if (!slug) return;
      const { data: cat } = await supabase.from("categories").select("*").eq("slug", slug).single();
      if (!cat) {
        setLoading(false);
        return;
      }
      setCategory(cat);
      const { data: prods } = await supabase
        .from("products")
        .select("*, categories(name,pair_price)")
        .eq("category_id", cat.id)
        .order("created_at", { ascending: false });
      setProducts(prods || []);
      setLoading(false);
    }
    load();
  }, [params?.slug]);

  // Брэндүүд (уг ангилалд харьяалагдах)
  const brands = useMemo(() => {
    return [...new Set(products.map((p) => p.brand).filter(Boolean))].sort();
  }, [products]);

  const filtered = useMemo(() => {
    if (activeBrand === "all") return products;
    return products.filter((p) => p.brand === activeBrand);
  }, [products, activeBrand]);

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-10"><p className="text-ink-400">Ачаалж байна...</p></div>;
  if (!category) return <div className="mx-auto max-w-7xl px-4 py-10"><p>Ангилал олдсонгүй</p></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-display text-3xl font-700">{category.name}</h1>
      <p className="text-sm text-ink-400 mt-1">{products.length} бараа</p>

      {/* Брэнд шүүлтүүр */}
      {brands.length > 0 && (
        <div className="mt-6 mb-4">
          <p className="text-xs font-semibold text-ink-400 uppercase mb-2">🏷 Брэнд</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveBrand("all")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeBrand === "all" ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"
              }`}
            >
              Бүгд ({products.length})
            </button>
            {brands.map((b) => {
              const count = products.filter((p) => p.brand === b).length;
              return (
                <button
                  key={b}
                  onClick={() => setActiveBrand(b)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeBrand === b ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"
                  }`}
                >
                  {b} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Барааны grid */}
      {filtered.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-ink-400">Бараа алга</div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
