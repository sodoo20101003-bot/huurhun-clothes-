"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";

const TZ = 8 * 3600000;
const localDay = (d) => new Date(new Date(d).getTime() + TZ).toISOString().slice(0, 10);
const localMonth = (d) => localDay(d).slice(0, 7);

export default function Dashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [sales, setSales] = useState([]);
  const [period, setPeriod] = useState("today"); // today | 7d | month | all

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: p }, { data: v }, { data: s }] = await Promise.all([
        supabase.from("categories").select("id,name").range(0, 9999),
        supabase.from("products").select("id,category_id").range(0, 100000),
        supabase.from("product_variants").select("stock,stock_branch1,stock_branch2").range(0, 100000),
        supabase.from("sales").select("total,qty,channel,product_id,product_name,created_at").range(0, 200000),
      ]);
      setCats(c || []); setProducts(p || []); setVariants(v || []); setSales(s || []);
      setLoading(false);
    })();
  }, []);

  const num = (x) => Number(x || 0);
  const now = Date.now();
  const todayStr = localDay(now);
  const monthStr = localMonth(now);
  const last7 = new Date(now - 7 * 86400000).toISOString();

  // product_id → category_id, category_id → name
  const prodCat = useMemo(() => {
    const m = {};
    for (const p of products) m[p.id] = p.category_id;
    return m;
  }, [products]);
  const catName = useMemo(() => {
    const m = {};
    for (const c of cats) m[c.id] = c.name;
    return m;
  }, [cats]);

  const inPeriod = (d) =>
    period === "all" ? true
    : period === "today" ? localDay(d) === todayStr
    : period === "7d" ? d >= last7
    : localMonth(d) === monthStr;

  const periodSales = useMemo(() => sales.filter((s) => inPeriod(s.created_at)), [sales, period, todayStr, monthStr, last7]);

  const revenue = periodSales.reduce((s, x) => s + num(x.total), 0);
  const qtySold = periodSales.reduce((s, x) => s + num(x.qty), 0);
  const posRev = periodSales.filter((x) => x.channel === "shop").reduce((s, x) => s + num(x.total), 0);
  const webRev = periodSales.filter((x) => x.channel !== "shop").reduce((s, x) => s + num(x.total), 0);

  // Каталогийн тоо
  const stock1 = variants.reduce((s, v) => s + num(v.stock_branch1), 0);
  const stock2 = variants.reduce((s, v) => s + num(v.stock_branch2), 0);
  const lowStock = variants.filter((v) => num(v.stock) <= 1).length;

  // Топ зарагдсан бараа
  const topProducts = useMemo(() => {
    const m = {};
    for (const x of periodSales) {
      const k = x.product_name || "—";
      if (!m[k]) m[k] = { qty: 0, rev: 0 };
      m[k].qty += num(x.qty); m[k].rev += num(x.total);
    }
    return Object.entries(m).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [periodSales]);

  // Ангилалаар борлуулалт
  const topCats = useMemo(() => {
    const m = {};
    for (const x of periodSales) {
      const cid = prodCat[x.product_id];
      const k = cid ? (catName[cid] || "Бусад") : "Бусад";
      if (!m[k]) m[k] = { qty: 0, rev: 0 };
      m[k].qty += num(x.qty); m[k].rev += num(x.total);
    }
    return Object.entries(m).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.rev - a.rev);
  }, [periodSales, prodCat, catName]);

  const periodLabel = period === "today" ? "Өнөөдөр" : period === "7d" ? "Сүүлийн 7 хоног" : period === "month" ? "Энэ сар" : "Бүх цаг үе";

  if (loading) return <p className="text-ink-400">Ачаалж байна...</p>;

  const Stat = ({ title, value, sub, tone }) => (
    <div className={`card p-5 ${tone === "dark" ? "bg-ink text-cream" : ""}`}>
      <p className={`text-xs ${tone === "dark" ? "text-cream/60" : "text-ink-400"}`}>{title}</p>
      <p className="mt-1 font-display text-2xl font-700">{value}</p>
      {sub && <p className={`mt-1 text-xs ${tone === "dark" ? "text-cream/50" : "text-ink-400"}`}>{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Хугацааны шүүлт */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-lg font-700 mr-2">📊 Статистик</h2>
        {[
          { v: "today", l: "Өнөөдөр" }, { v: "7d", l: "7 хоног" },
          { v: "month", l: "Энэ сар" }, { v: "all", l: "Бүх цаг" },
        ].map((r) => (
          <button key={r.v} onClick={() => setPeriod(r.v)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${period === r.v ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"}`}>{r.l}</button>
        ))}
      </div>

      {/* Борлуулалт (сонгосон хугацаа) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat tone="dark" title={`💰 Орлого · ${periodLabel}`} value={formatPrice(revenue)} sub={`${qtySold} ширхэг зарагдсан`} />
        <Stat title="🏪 Кассын борлуулалт" value={formatPrice(posRev)} />
        <Stat title="🌐 Онлайн борлуулалт" value={formatPrice(webRev)} />
        <Stat title="🛍 Зарагдсан бараа" value={`${qtySold} ш`} sub={`${topProducts.length} төрөл`} />
      </div>

      {/* Каталог */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat title="🗂 Ангилал" value={cats.length} />
        <Stat title="📦 Бараа төрөл" value={products.length} />
        <Stat title="🔢 Variant (размер/өнгө)" value={variants.length} />
        <div className="card p-5 bg-green-50 border border-green-200">
          <p className="text-xs text-green-700">📊 Нийт нөөц</p>
          <p className="mt-1 font-display text-2xl font-700 text-green-700">{stock1 + stock2}</p>
          <p className="mt-1 text-xs text-green-700/70">С1 {stock1} · С2 {stock2}</p>
        </div>
      </div>

      {/* Дуусаж буй сэрэмжлүүлэг */}
      {lowStock > 0 && (
        <Link href="/admin/inventory-branches" className="card flex items-center gap-3 p-4 border border-beak/30 bg-beak-100/40 hover:shadow-card transition">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-red-100 text-red-600">🔴</span>
          <span className="text-sm"><b className="text-red-600">{lowStock}</b> размер дуусаж байна (≤1 ширхэг). Харах →</span>
        </Link>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Топ бараа */}
        <div className="card p-5">
          <h3 className="font-display font-600">🏆 Хамгийн их зарагдсан — {periodLabel}</h3>
          <div className="mt-3 space-y-2">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3 text-sm">
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-700 ${i === 0 ? "bg-beak text-ink" : i < 3 ? "bg-beak-100 text-beak-600" : "bg-cream text-ink-400"}`}>{i + 1}</span>
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-xs text-ink-400">{p.qty} ш</span>
                <span className="font-display font-600">{formatPrice(p.rev)}</span>
              </div>
            ))}
            {topProducts.length === 0 && <p className="text-sm text-ink-400">Энэ хугацаанд борлуулалт алга.</p>}
          </div>
        </div>

        {/* Ангилалаар */}
        <div className="card p-5">
          <h3 className="font-display font-600">🗂 Ангилалаар борлуулалт — {periodLabel}</h3>
          <div className="mt-3 space-y-2">
            {topCats.map((c) => {
              const pct = revenue > 0 ? (c.rev / revenue) * 100 : 0;
              return (
                <div key={c.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-ink-400">{c.qty} ш · {formatPrice(c.rev)}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink/5">
                    <div className="h-full bg-beak" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {topCats.length === 0 && <p className="text-sm text-ink-400">Энэ хугацаанд борлуулалт алга.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
