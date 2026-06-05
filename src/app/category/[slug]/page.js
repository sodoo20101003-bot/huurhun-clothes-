import { createClient } from "@/lib/supabase/server";
import ProductCard from "@/components/ProductCard";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }) {
  const supabase = createClient();
  const slug = decodeURIComponent(params.slug);
  const { data: cat } = await supabase
    .from("categories")
    .select("id,name")
    .eq("slug", slug)
    .single();

  if (!cat) notFound();

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", cat.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-3xl font-700">{cat.name}</h1>
      <p className="mt-1 text-ink-400">{products?.length || 0} бараа</p>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(products || []).map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
      {(!products || products.length === 0) && (
        <p className="py-16 text-center text-ink-400">Энэ ангилалд бараа алга байна.</p>
      )}
    </div>
  );
}
