import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ProductView from "@/components/ProductView";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }) {
  const supabase = createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*, categories(name,slug,pair_price)")
    .eq("id", params.id)
    .single();

  if (!product) notFound();

  const [{ data: variants }, { data: related }] = await Promise.all([
    supabase.from("product_variants").select("size,color,stock").eq("product_id", product.id),
    supabase.from("products").select("*").eq("category_id", product.category_id).neq("id", product.id).limit(4),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <ProductView product={product} variants={variants || []} />

      {related?.length > 0 && (
        <section className="mt-16 sm:mt-20">
          <h2 className="font-display text-2xl font-700">Төстэй бараа</h2>
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
