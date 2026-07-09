"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

export default function ProfitPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState({});
  const [period, setPeriod] = useState("all"); // all | today | week | month
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("sales").select("*").order("created_at", { ascending: false }).limit(10000),
      supabase.from("products").select("id,name,price,cost_price,images"),
    ]).then(([sRes, pRes]) => {
      setSales(sRes.data || []);
      const productMap = {};
      (pRes.data || []).forEach(p => { productMap[p.id] = p; });
      setProducts(productMap);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-ink-400">Ачаалж байна...</p>;

  // Time filter
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);

  const filtered = sales.filter(s => {
    const d = new Date(s.created_at);
    if (period === "today") return d >= startOfToday;
    if (period === "week") return d >= weekAgo;
    if (period === "month") return d >= monthAgo;
    return true;
  });

  // Бүлэглэх бараа тус бүрд
  const byProduct = {};
  let totalRevenue = 0;
  let totalCost = 0;
  let totalQty = 0;

  for (const s of filtered) {
    const productId = s.product_id;
    const product = products[productId];
    if (!byProduct[productId]) {
      byProduct[productId] = {
        id: productId,
        name: product?.name || s.product_name || "—",
        image: Array.isArray(product?.images) ? product.images[0] : product?.images,
        sellPrice: Number(product?.price || 0),
        costPrice: Number(product?.cost_price || 0),
        qty: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
    }
    const p = byProduct[productId];
    const qty = Number(s.qty || 0);
    const revenue = Number(s.total || 0);
    // cost_price sales-с эсвэл product-с авна
    const costPerUnit = Number(s.cost_price || product?.cost_price || 0);
    const cost = costPerUnit * qty;
    
    p.qty += qty;
    p.revenue += revenue;
    p.cost += cost;
    p.profit = p.revenue - p.cost;
    
    totalRevenue += revenue;
    totalCost += cost;
    totalQty += qty;
  }

  const totalProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const productList = Object.values(byProduct)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.profit - a.profit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-700">💰 Ашиг</h1>
          <p className="text-sm text-ink-400 mt-1">Бараа тус бүрд орлого, өртөг, цэвэр ашиг</p>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex flex-wrap gap-2">
        {[
          { v: "all", l: "Бүгд" },
          { v: "today", l: "Өнөөдөр" },
          { v: "week", l: "7 хоног" },
          { v: "month", l: "Энэ сар" },
        ].map(p => (
          <button key={p.v} onClick={() => setPeriod(p.v)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              period === p.v ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"
            }`}>
            {p.l}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card p-5">
          <p className="text-xs text-ink-400 font-semibold">💵 НИЙТ ОРЛОГО</p>
          <p className="font-display font-700 text-2xl text-green-700 mt-1">{formatPrice(totalRevenue)}</p>
          <p className="text-xs text-ink-400 mt-1">{totalQty} ширхэг зарагдсан</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-ink-400 font-semibold">📦 НИЙТ ӨРТӨГ</p>
          <p className="font-display font-700 text-2xl text-red-500 mt-1">{formatPrice(totalCost)}</p>
          <p className="text-xs text-ink-400 mt-1">Барааны үндсэн үнэ</p>
        </div>
        <div className="card p-5 bg-gradient-to-br from-beak-100 to-cream">
          <p className="text-xs text-ink-400 font-semibold">✨ ЦЭВЭР АШИГ</p>
          <p className="font-display font-700 text-2xl text-beak-600 mt-1">{formatPrice(totalProfit)}</p>
          <p className="text-xs text-ink-400 mt-1">Ашгийн хувь: <b>{profitMargin.toFixed(1)}%</b></p>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <input
          type="text"
          placeholder="🔍 Бараа хайх..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-full !py-2"
        />
      </div>

      {/* Product table */}
      <div className="card overflow-hidden">
        <div className="bg-ink text-cream p-3 grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 text-xs font-bold">
          <div>Бараа</div>
          <div className="text-center">Ширхэг</div>
          <div className="text-right">Орлого</div>
          <div className="text-right">Өртөг</div>
          <div className="text-right">Цэвэр ашиг</div>
        </div>
        <div className="divide-y divide-ink/5 max-h-[60vh] overflow-y-auto">
          {productList.length === 0 && (
            <p className="text-center text-ink-400 py-8">Зарагдалт алга байна</p>
          )}
          {productList.map(p => {
            const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
            return (
              <div key={p.id} className="p-3 grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 items-center hover:bg-cream/20 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {p.image ? (
                    <img src={typeof p.image === "string" ? p.image : p.image?.url}
                      alt={p.name}
                      className="h-12 w-12 rounded-lg object-cover shrink-0 bg-cream" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-cream shrink-0 grid place-items-center text-2xl">📦</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{p.name}</p>
                    <p className="text-[10px] text-ink-400">
                      Зарж: {formatPrice(p.sellPrice)} · Үндсэн: {formatPrice(p.costPrice)}
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <b>{p.qty}</b>
                  <p className="text-[10px] text-ink-400">ш</p>
                </div>
                <div className="text-right text-green-700 font-semibold">
                  {formatPrice(p.revenue)}
                </div>
                <div className="text-right text-red-500">
                  {formatPrice(p.cost)}
                </div>
                <div className="text-right">
                  <p className="text-beak-600 font-bold">{formatPrice(p.profit)}</p>
                  <p className="text-[10px] text-ink-400">{margin.toFixed(0)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-xs text-ink-400 p-3">
        💡 <b>Тайлбар:</b> Ашиг = Зарсан үнэ - Үндсэн үнэ. Барааны <b>Үндсэн үнэ</b> (өртөг) талбарыг Бараа хуудаснаас засаж болно.
      </div>
    </div>
  );
}
