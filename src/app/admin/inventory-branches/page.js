"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { firstImageUrl } from "@/lib/utils";

const SIZE_ORDER = { XS: 1, S: 2, M: 3, L: 4, XL: 5, "2XL": 6, "3XL": 7, "4XL": 8 };
const sizeKey = (s) => {
  if (!s) return 0;
  const upper = String(s).toUpperCase();
  if (SIZE_ORDER[upper]) return SIZE_ORDER[upper];
  const n = parseFloat(s);
  return isNaN(n) ? 1000 : n;
};

export default function InventoryBranchesPage() {
  const supabase = createClient();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("both"); // both | branch1 | branch2
  const [search, setSearch] = useState("");

  async function load() {
    const [{ data: p }, { data: v }] = await Promise.all([
      supabase.from("products").select("id,name,images,category_id,categories(name)").order("name"),
      supabase.from("product_variants").select("product_id,size,color,stock,stock_branch2"),
    ]);
    const vbp = {};
    for (const x of (v || [])) {
      if (!vbp[x.product_id]) vbp[x.product_id] = [];
      vbp[x.product_id].push(x);
    }
    for (const pid of Object.keys(vbp)) {
      vbp[pid].sort((a, b) => {
        const cA = a.color || "ZZZ";
        const cB = b.color || "ZZZ";
        if (cA !== cB) return cA.localeCompare(cB, "mn");
        return sizeKey(a.size) - sizeKey(b.size);
      });
    }
    setProducts((p || []).map((pr) => {
      const vs = vbp[pr.id] || [];
      const s1 = vs.reduce((s, x) => s + Number(x.stock || 0), 0);
      const s2 = vs.reduce((s, x) => s + Number(x.stock_branch2 || 0), 0);
      return { ...pr, _variants: vs, _stock1: s1, _stock2: s2, _total: s1 + s2 };
    }));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, search]);

  const totalStock1 = filtered.reduce((s, p) => s + p._stock1, 0);
  const totalStock2 = filtered.reduce((s, p) => s + p._stock2, 0);

  if (loading) return <p className="text-ink-400">Ачаалж байна...</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-700">🏪 Салбар бүрийн үлдэгдэл</h2>
          <p className="text-sm text-ink-400 mt-1">Сарын тооллогод харьцуулах</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs text-ink-400 mb-1">🏪 Салбар 1</p>
          <p className="font-display font-700 text-2xl text-green-600">{totalStock1}</p>
          <p className="text-xs text-ink-400">нийт ширхэг</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-400 mb-1">🏪 Салбар 2</p>
          <p className="font-display font-700 text-2xl text-beak-600">{totalStock2}</p>
          <p className="text-xs text-ink-400">нийт ширхэг</p>
        </div>
        <div className="card p-4 bg-cream/50">
          <p className="text-xs text-ink-400 mb-1">📦 Нийт</p>
          <p className="font-display font-700 text-2xl">{totalStock1 + totalStock2}</p>
          <p className="text-xs text-ink-400">бүх салбар</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="🔍 Бараа хайх..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1 min-w-[200px]"
        />
        <div className="flex rounded-full bg-cream p-1">
          {[
            { v: "both", l: "Хоёулаа" },
            { v: "branch1", l: "🏪 С1" },
            { v: "branch2", l: "🏪 С2" },
          ].map((t) => (
            <button
              key={t.v}
              onClick={() => setView(t.v)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-full transition ${
                view === t.v ? "bg-ink text-cream" : "text-ink hover:bg-paper"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <div className="card divide-y divide-ink/5 p-2">
        {filtered.map((p) => (
          <div key={p.id} className="p-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream">
                {firstImageUrl(p.images) && <img src={firstImageUrl(p.images)} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{p.name}</p>
                <p className="text-xs text-ink-400">{p.categories?.name || "—"}</p>
              </div>
              <div className="text-right text-sm">
                {view === "both" && (
                  <div className="flex gap-3">
                    <span className="text-green-600 font-semibold">С1: {p._stock1}</span>
                    <span className="text-beak-600 font-semibold">С2: {p._stock2}</span>
                    <span className="text-ink font-bold">Σ {p._total}</span>
                  </div>
                )}
                {view === "branch1" && <span className="text-green-600 font-bold text-lg">{p._stock1}</span>}
                {view === "branch2" && <span className="text-beak-600 font-bold text-lg">{p._stock2}</span>}
              </div>
            </div>

            {p._variants.length > 0 && (
              <div className="pl-[60px] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                {p._variants.map((v, i) => {
                  const s1 = Number(v.stock || 0);
                  const s2 = Number(v.stock_branch2 || 0);
                  const showS1 = view !== "branch2";
                  const showS2 = view !== "branch1";
                  const total = s1 + s2;
                  return (
                    <div
                      key={i}
                      className={`text-xs rounded-md px-2 py-1 border ${
                        total === 0 ? "bg-red-50 border-red-200 text-red-600" :
                        total < 5 ? "bg-beak-100 border-beak/30 text-beak-600" :
                        "bg-green-50 border-green-200 text-green-700"
                      }`}
                    >
                      <div className="font-semibold truncate">{[v.size, v.color].filter(Boolean).join(" / ") || "—"}</div>
                      <div className="flex gap-2 mt-0.5">
                        {showS1 && <span><span className="opacity-60">С1:</span> <b>{s1}</b></span>}
                        {showS2 && <span><span className="opacity-60">С2:</span> <b>{s2}</b></span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="p-6 text-center text-sm text-ink-400">Бараа алга</p>}
      </div>
    </div>
  );
}
