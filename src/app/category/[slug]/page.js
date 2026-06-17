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
        .select("*, categories(name,pair_price), brands(id,name,logo_url)")
        .eq("category_id", cat.id)
        .order("created_at", { ascending: false });
      setProducts(prods || []);
      setLoading(false);
    }
    load();
  }, [params?.slug]);

  // Тухайн ангилалд харьяалагдах брэндүүд (давхарласан байх ёсгүй)
  const brands = useMemo(() => {
    const map = {};
    for (const p of products) {
      if (p.brands?.id && !map[p.brands.id]) {
        map[p.brands.id] = {
          id: p.brands.id,
          name: p.brands.name,
          logo_url: p.brands.logo_url,
          count: 0,
        };
      }
      if (p.brands?.id) map[p.brands.id].count++;
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [products]);

  const filtered = useMemo(() => {
    if (activeBrand === "all") return products;
    return products.filter((p) => p.brand_id === activeBrand);
  }, [products, activeBrand]);

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-10"><p className="text-ink-400">Ачаалж байна...</p></div>;
  if (!category) return <div className="mx-auto max-w-7xl px-4 py-10"><p>Ангилал олдсонгүй</p></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-display text-3xl font-700">{category.name}</h1>
      <p className="text-sm text-ink-400 mt-1">{products.length} бараа</p>

      {/* Брэнд шүүлтүүр — Logo-той chip-үүд */}
      {brands.length > 0 && (
        <div className="mt-6 mb-4">
          <p className="text-xs font-semibold text-ink-400 uppercase mb-3">🏷 Брэнд</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveBrand("all")}
              className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                activeBrand === "all" ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"
              }`}
            >
              Бүгд <span className="opacity-60 text-xs">({products.length})</span>
            </button>
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveBrand(b.id)}
                className={`flex items-center gap-2 rounded-full pr-4 pl-2 py-1.5 text-sm font-semibold transition ${
                  activeBrand === b.id ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"
                }`}
              >
                {b.logo_url ? (
                  <img src={b.logo_url} alt={b.name} className={`h-7 w-7 rounded-full object-contain bg-paper p-0.5 ${activeBrand === b.id ? "" : ""}`} />
                ) : (
                  <span className={`h-7 w-7 grid place-items-center rounded-full text-xs ${activeBrand === b.id ? "bg-cream/20" : "bg-paper"}`}>
                    {b.name[0]}
                  </span>
                )}
                {b.name} <span className="opacity-60 text-xs">({b.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
