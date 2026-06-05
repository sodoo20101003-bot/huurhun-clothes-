"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFavorites } from "@/context/FavoritesContext";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";

export default function FavoritesPage() {
  const { ids, ready } = useFavorites();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase
      .from("products")
      .select("*, categories(name)")
      .in("id", ids)
      .then(({ data }) => {
        setProducts(data || []);
        setLoading(false);
      });
  }, [ids, ready]);

  if (!ready || loading) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-700 mb-6">❤️ Дуртай бараа</h1>

      {products.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-3xl mb-2">🤍</p>
          <p className="text-ink-400">Дуртай бараа алга байна</p>
          <p className="mt-1 text-sm text-ink-400">Бараан дээр 🤍 товч дарж дуртайдаа нэмж болно.</p>
          <Link href="/" className="btn-accent mt-4 inline-block">Дэлгүүр үзэх</Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-400 mb-4">{products.length} бараа</p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {products.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </>
      )}
    </div>
  );
}
