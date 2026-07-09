"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function BulkRestockPage() {
  const supabase = createClient();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [amounts, setAmounts] = useState({}); // { variantId: { s1: 5, s2: 3 } }
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.from("products").select("id,name,price").order("name").then(({ data }) => {
      setProducts(data || []);
      setLoading(false);
    });
  }, []);

  async function openProduct(p) {
    setSelectedProduct(p);
    setVariants([]);
    setAmounts({});
    setMessage("");
    const { data } = await supabase.from("product_variants")
      .select("id,size,color,stock_branch1,stock_branch2")
      .eq("product_id", p.id);
    // Sort by color, then size
    const sorted = (data || []).sort((a, b) => {
      const colorCmp = (a.color || "").localeCompare(b.color || "");
      if (colorCmp !== 0) return colorCmp;
      return (a.size || "").localeCompare(b.size || "");
    });
    setVariants(sorted);
  }

  function setAmount(variantId, branch, value) {
    setAmounts((prev) => ({
      ...prev,
      [variantId]: { ...(prev[variantId] || {}), [branch]: value }
    }));
  }

  async function submitAll() {
    setMessage("");
    const toRestock = variants
      .map(v => ({
        variant: v,
        s1: Number(amounts[v.id]?.s1 || 0),
        s2: Number(amounts[v.id]?.s2 || 0),
      }))
      .filter(x => x.s1 > 0 || x.s2 > 0);

    if (toRestock.length === 0) {
      setMessage("⚠️ Хэдэн ширхэг нэмэхээ бөглөнө үү");
      return;
    }

    setSaving(true);
    try {
      let successCount = 0;
      for (const item of toRestock) {
        // Салбар 1
        if (item.s1 > 0) {
          const res = await fetch("/api/restock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: selectedProduct.id,
              productName: selectedProduct.name,
              size: item.variant.size,
              color: item.variant.color,
              qty: item.s1,
              branch: "branch1",
              note: note || null,
            }),
          });
          if (res.ok) successCount++;
        }
        // Салбар 2
        if (item.s2 > 0) {
          const res = await fetch("/api/restock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: selectedProduct.id,
              productName: selectedProduct.name,
              size: item.variant.size,
              color: item.variant.color,
              qty: item.s2,
              branch: "branch2",
              note: note || null,
            }),
          });
          if (res.ok) successCount++;
        }
      }

      setMessage(`✅ ${successCount} ачаа амжилттай нэмэгдлээ!`);
      setAmounts({});
      setNote("");
      // Reload variants
      await openProduct(selectedProduct);
    } catch (e) {
      setMessage(`❌ Алдаа: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  const filteredProducts = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p className="text-ink-400">Ачаалж байна...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-700">📦 Ачаа нэмэх</h1>
          <p className="text-sm text-ink-400 mt-1">Нэг барааны бүх variant-д зэрэг тоо оруулаад нэг дор нэмнэ</p>
        </div>
        <Link href="/admin/products" className="text-sm text-ink-400 hover:text-ink">← Бараа руу</Link>
      </div>

      {!selectedProduct ? (
        // === БАРАА СОНГОХ ===
        <div className="card p-4 space-y-3">
          <input
            type="text"
            placeholder="🔍 Бараа хайх..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full !py-3"
          />
          <div className="grid gap-2 max-h-[70vh] overflow-y-auto">
            {filteredProducts.map(p => (
              <button
                key={p.id}
                onClick={() => openProduct(p)}
                className="flex justify-between items-center p-3 rounded-lg border border-ink/10 hover:border-beak hover:bg-cream/30 transition text-left"
              >
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-ink-400">{p.price?.toLocaleString()}₮</p>
                </div>
                <span className="text-ink-400">→</span>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <p className="text-center text-ink-400 py-8">Бараа олдсонгүй</p>
            )}
          </div>
        </div>
      ) : (
        // === VARIANT ЖАГСААЛТАД ТОО БӨГЛӨХ ===
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-xs text-ink-400">Сонгосон бараа</p>
                <h2 className="font-display text-xl font-700">{selectedProduct.name}</h2>
              </div>
              <button
                onClick={() => { setSelectedProduct(null); setVariants([]); setAmounts({}); }}
                className="text-sm text-ink-400 hover:text-ink px-3 py-1.5 rounded-lg border border-ink/15"
              >
                ← Өөр бараа
              </button>
            </div>

            <div>
              <label className="text-xs text-ink-400 font-semibold mb-1 block">Тэмдэглэл (заавал биш)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ж: 2026.07.05-ны ачаа"
                className="input w-full !py-2"
              />
            </div>
          </div>

          {/* Variant хүснэгт */}
          <div className="card overflow-hidden">
            <div className="bg-ink text-cream p-3 grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 text-xs font-bold">
              <div>Variant</div>
              <div className="text-center">Одоогийн үлдэгдэл</div>
              <div className="text-center">➕ Салбар 1</div>
              <div className="text-center">➕ Салбар 2</div>
            </div>
            <div className="divide-y divide-ink/5 max-h-[55vh] overflow-y-auto">
              {variants.length === 0 && (
                <p className="text-center text-ink-400 py-8">Variant алга байна</p>
              )}
              {variants.map(v => (
                <div key={v.id} className="p-3 grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 items-center hover:bg-cream/20">
                  <div>
                    <p className="font-semibold text-sm">
                      {v.size || "—"}
                      {v.color && <span className="text-ink-400"> · {v.color}</span>}
                    </p>
                  </div>
                  <div className="text-center text-sm">
                    <span className="text-green-700 font-bold">{v.stock_branch1 || 0}</span>
                    <span className="text-ink-400 mx-1">/</span>
                    <span className="text-beak-600 font-bold">{v.stock_branch2 || 0}</span>
                    <p className="text-[10px] text-ink-400">С1 / С2</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      value={amounts[v.id]?.s1 || ""}
                      onChange={(e) => setAmount(v.id, "s1", e.target.value)}
                      placeholder="0"
                      className="input w-full !py-2 text-center"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      value={amounts[v.id]?.s2 || ""}
                      onChange={(e) => setAmount(v.id, "s2", e.target.value)}
                      placeholder="0"
                      className="input w-full !py-2 text-center"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {message && (
            <div className={`card p-4 text-center ${message.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {message}
            </div>
          )}

          {/* Нэг товч — бүгдийг нэмэх */}
          <button
            onClick={submitAll}
            disabled={saving}
            className="btn-accent w-full !py-4 text-lg"
          >
            {saving ? "Нэмж байна..." : "💾 БҮГДИЙГ ХАДГАЛАХ"}
          </button>
        </div>
      )}
    </div>
  );
}
