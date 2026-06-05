"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";

// Төлбөрийн төрлийн монгол нэр
const PAY_LABELS = {
  khan: "Хаан банк", golomt: "Голомт", tdb: "ХХБ", state: "Төрийн банк",
  xac: "Хас банк", qpay: "QPay", cash: "Бэлэн мөнгө", card: "Карт",
  mbank: "М банк", most: "MostMoney", ard: "Ard", monpay: "Monpay",
  socialpay: "SocialPay", toki: "Toki", pocket: "Pocket", storepay: "StorePay",
};
function payLabel(m) {
  if (!m) return "Бусад";
  const key = String(m).toLowerCase();
  for (const k of Object.keys(PAY_LABELS)) {
    if (key.includes(k)) return PAY_LABELS[k];
  }
  return m;
}

function monthKey(d) {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function dayKey(d) {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function ReportsPage() {
  const supabase = createClient();
  const [sales, setSales] = useState([]);
  const [stockMap, setStockMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date()));
  const [expandedDay, setExpandedDay] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from("sales").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id,name"),
      supabase.from("product_variants").select("product_id,stock"),
    ]).then(([salesRes, prodRes, varRes]) => {
      setSales(salesRes.data || []);
      // Бараа бүрийн одоогийн нийт үлдэгдэл
      const stockByProduct = {};
      const nameById = {};
      for (const p of (prodRes.data || [])) nameById[p.id] = p.name;
      for (const v of (varRes.data || [])) {
        const name = nameById[v.product_id];
        if (!name) continue;
        stockByProduct[name] = (stockByProduct[name] || 0) + Number(v.stock || 0);
      }
      setStockMap(stockByProduct);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-ink-400">Ачаалж байна...</p>;

  // Боломжит сарууд
  const months = [...new Set(sales.map((s) => monthKey(s.created_at)))].sort().reverse();
  if (months.length === 0) months.push(monthKey(new Date()));

  // Сонгосон сарын борлуулалт
  const monthSales = sales.filter((s) => monthKey(s.created_at) === selectedMonth);

  // === Сарын нийт ===
  const totalRevenue = monthSales.reduce((s, x) => s + Number(x.total || 0), 0);
  const totalQty = monthSales.reduce((s, x) => s + Number(x.qty || 0), 0);
  const webSales = monthSales.filter((s) => s.channel === "web");
  const shopSales = monthSales.filter((s) => s.channel === "shop");
  const webRevenue = webSales.reduce((s, x) => s + Number(x.total || 0), 0);
  const shopRevenue = shopSales.reduce((s, x) => s + Number(x.total || 0), 0);
  const webQty = webSales.reduce((s, x) => s + Number(x.qty || 0), 0);
  const shopQty = shopSales.reduce((s, x) => s + Number(x.qty || 0), 0);

  // === Төлбөрийн төрлөөр ===
  const byPayment = {};
  for (const s of monthSales) {
    const label = payLabel(s.payment_method);
    if (!byPayment[label]) byPayment[label] = { qty: 0, revenue: 0 };
    byPayment[label].qty += Number(s.qty || 0);
    byPayment[label].revenue += Number(s.total || 0);
  }
  const paymentRows = Object.entries(byPayment).sort((a, b) => b[1].revenue - a[1].revenue);

  // === Бараагаар ===
  const byProduct = {};
  for (const s of monthSales) {
    const key = s.product_name;
    if (!byProduct[key]) byProduct[key] = { qty: 0, revenue: 0, web: 0, shop: 0, variants: {} };
    byProduct[key].qty += Number(s.qty || 0);
    byProduct[key].revenue += Number(s.total || 0);
    if (s.channel === "web") byProduct[key].web += Number(s.qty || 0);
    else byProduct[key].shop += Number(s.qty || 0);
    // Размер + өнгө бүрээр
    const vKey = [s.size, s.color].filter(Boolean).join(" / ") || "—";
    byProduct[key].variants[vKey] = (byProduct[key].variants[vKey] || 0) + Number(s.qty || 0);
  }
  const productRows = Object.entries(byProduct).sort((a, b) => b[1].qty - a[1].qty);

  // === Өдөр бүрээр ===
  const byDay = {};
  for (const s of monthSales) {
    const key = dayKey(s.created_at);
    if (!byDay[key]) byDay[key] = { qty: 0, revenue: 0, web: 0, shop: 0 };
    byDay[key].qty += Number(s.qty || 0);
    byDay[key].revenue += Number(s.total || 0);
    if (s.channel === "web") byDay[key].web += Number(s.qty || 0);
    else byDay[key].shop += Number(s.qty || 0);
  }
  const dayRows = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="space-y-6">
      {/* Сар сонгох */}
      <div className="flex items-center gap-3">
        <h2 className="font-display text-lg font-700">📊 Борлуулалтын тайлан</h2>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="input !w-auto !py-2 ml-auto"
        >
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Сарын нийт дүн */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-5 bg-ink text-cream">
          <p className="text-xs text-cream/60">💰 Нийт орлого</p>
          <p className="mt-1 font-display text-2xl font-700">{formatPrice(totalRevenue)}</p>
          <p className="mt-1 text-xs text-cream/50">{totalQty} ширхэг зарагдсан</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-ink-400">🌐 Вэбээс</p>
          <p className="mt-1 font-display text-xl font-700 text-beak-600">{formatPrice(webRevenue)}</p>
          <p className="mt-1 text-xs text-ink-400">{webQty} ширхэг</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-ink-400">🏪 Дэлгүүрээс</p>
          <p className="mt-1 font-display text-xl font-700 text-beak-600">{formatPrice(shopRevenue)}</p>
          <p className="mt-1 text-xs text-ink-400">{shopQty} ширхэг</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-ink-400">📦 Нийт зарсан</p>
          <p className="mt-1 font-display text-2xl font-700 text-green-600">{totalQty}</p>
          <p className="mt-1 text-xs text-ink-400">
            одоо агуулахад {Object.values(stockMap).reduce((s, x) => s + x, 0)} үлдсэн
          </p>
        </div>
      </div>

      {/* Төлбөрийн төрлөөр */}
      <div className="card p-5">
        <h3 className="font-display font-600">💳 Төлбөрийн төрлөөр</h3>
        <div className="mt-3 space-y-2">
          {paymentRows.map(([label, v]) => (
            <div key={label} className="flex items-center gap-3 text-sm">
              <span className="flex-1 font-semibold">{label}</span>
              <span className="text-ink-400">{v.qty} ширхэг</span>
              <span className="font-display font-600 w-28 text-right">{formatPrice(v.revenue)}</span>
            </div>
          ))}
          {paymentRows.length === 0 && <p className="text-sm text-ink-400">Мэдээлэл алга</p>}
        </div>
      </div>

      {/* Бараагаар */}
      <div className="card p-5">
        <h3 className="font-display font-600">👕 Бараагаар (зарагдсан + одоогийн үлдэгдэл)</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-400 border-b border-ink/10">
                <th className="pb-2">Бараа</th>
                <th className="pb-2 text-center">Вэб</th>
                <th className="pb-2 text-center">Дэлгүүр</th>
                <th className="pb-2 text-center">Зарсан</th>
                <th className="pb-2 text-center">📦 Үлдсэн</th>
                <th className="pb-2 text-right">Орлого</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {productRows.map(([name, v]) => {
                const remaining = stockMap[name];
                return (
                  <tr key={name}>
                    <td className="py-2">
                      <p className="font-semibold">{name}</p>
                      <p className="text-xs text-ink-400 mt-0.5">
                        {Object.entries(v.variants).map(([variant, qty]) => (
                          <span key={variant} className="inline-block mr-2">
                            <b>{variant}</b>: {qty}ш
                          </span>
                        ))}
                      </p>
                    </td>
                    <td className="py-2 text-center text-ink-400">{v.web}</td>
                    <td className="py-2 text-center text-ink-400">{v.shop}</td>
                    <td className="py-2 text-center font-semibold">{v.qty}</td>
                    <td className="py-2 text-center">
                      {remaining === undefined ? (
                        <span className="text-ink-400">—</span>
                      ) : (
                        <span className={`font-semibold ${remaining === 0 ? "text-red-500" : remaining < 5 ? "text-beak-600" : "text-green-600"}`}>
                          {remaining}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right font-display font-600">{formatPrice(v.revenue)}</td>
                  </tr>
                );
              })}
              {productRows.length === 0 && (
                <tr><td colSpan={6} className="py-4 text-center text-ink-400">Мэдээлэл алга</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Өдөр бүрээр */}
      <div className="card p-5">
        <h3 className="font-display font-600">📅 Өдөр бүрээр (дарж дэлгэрэнгүй харах)</h3>
        <div className="mt-3 space-y-2">
          {dayRows.map(([day, v]) => {
            const isOpen = expandedDay === day;
            const daySales = monthSales.filter((s) => dayKey(s.created_at) === day);
            return (
              <div key={day} className="rounded-lg bg-cream/50 overflow-hidden">
                <button
                  onClick={() => setExpandedDay(isOpen ? null : day)}
                  className="flex w-full items-center gap-3 p-3 text-left text-sm hover:bg-cream transition"
                >
                  <span className="text-lg">{isOpen ? "▼" : "▶"}</span>
                  <span className="font-semibold">{day}</span>
                  <span className="text-xs text-ink-400">🌐 {v.web} · 🏪 {v.shop}</span>
                  <span className="ml-auto text-ink-400">{v.qty} ширхэг</span>
                  <span className="font-display font-600 w-28 text-right">{formatPrice(v.revenue)}</span>
                </button>

                {/* Дэлгэрэнгүй */}
                {isOpen && (
                  <div className="border-t border-ink/10 bg-paper p-3 space-y-2">
                    {daySales.map((s) => (
                      <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-cream/40 p-2 text-sm">
                        <span className="font-semibold flex-1 min-w-[150px]">{s.product_name}</span>
                        <span className="text-xs text-ink-400">
                          {[s.size, s.color].filter(Boolean).join(" / ") || "—"} ×{s.qty}
                        </span>
                        <span className={`chip text-xs ${s.channel === "web" ? "border-blue-300 text-blue-700" : "border-beak/30 text-beak-600"}`}>
                          {s.channel === "web" ? "🌐 Вэб" : "🏪 Дэлгүүр"}
                        </span>
                        <span className="chip text-xs border-ink/20">
                          💳 {payLabel(s.payment_method)}
                        </span>
                        <span className="font-display font-600">{formatPrice(s.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {dayRows.length === 0 && <p className="text-sm text-ink-400">Мэдээлэл алга</p>}
        </div>
      </div>
    </div>
  );
}
