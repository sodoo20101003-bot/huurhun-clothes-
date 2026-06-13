"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

const CHART_COLORS = ["#F2A24E", "#2C3A57", "#22c55e", "#3b82f6", "#ec4899", "#a855f7", "#f59e0b"];

// Төлбөрийн төрлийн монгол нэр
const PAY_LABELS = {
  khan: "Хаан банк", golomt: "Голомт", tdb: "ХХБ", state: "Төрийн банк",
  xac: "Хас банк", qpay: "QPay", cash: "Бэлэн мөнгө", card: "Карт",
  mbank: "М банк", most: "MostMoney", ard: "Ard", monpay: "Monpay",
  socialpay: "SocialPay", toki: "Toki", pocket: "Pocket", storepay: "StorePay",
  dans: "Данс",
};
function payLabel(m) {
  if (!m) return "Бусад";
  const key = String(m).toLowerCase();
  for (const k of Object.keys(PAY_LABELS)) {
    if (key.includes(k)) return PAY_LABELS[k];
  }
  return m;
}

const BRANCH_LABELS = {
  branch1: "Салбар 1",
  branch2: "Салбар 2",
};
function branchLabel(b) {
  return BRANCH_LABELS[b] || "—";
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

  const months = [...new Set(sales.map((s) => monthKey(s.created_at)))].sort().reverse();
  if (months.length === 0) months.push(monthKey(new Date()));

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

  // === Салбараар (зөвхөн дэлгүүрийн зарагдалт) ===
  const byBranch = {};
  for (const s of shopSales) {
    const key = s.branch || "branch1";
    if (!byBranch[key]) byBranch[key] = { qty: 0, revenue: 0, byPay: {} };
    byBranch[key].qty += Number(s.qty || 0);
    byBranch[key].revenue += Number(s.total || 0);
    const payKey = payLabel(s.payment_method);
    if (!byBranch[key].byPay[payKey]) byBranch[key].byPay[payKey] = { qty: 0, revenue: 0 };
    byBranch[key].byPay[payKey].qty += Number(s.qty || 0);
    byBranch[key].byPay[payKey].revenue += Number(s.total || 0);
  }
  const branchRows = Object.entries(byBranch).sort((a, b) => b[1].revenue - a[1].revenue);

  // === Төлбөрийн төрлөөр (нийт) ===
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

  // === ГРАФИКИЙН ӨГӨГДӨЛ ===
  const last30Days = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    const dayData = sales.filter((s) => dayKey(s.created_at) === key);
    const revenue = dayData.reduce((sum, x) => sum + Number(x.total || 0), 0);
    const qty = dayData.reduce((sum, x) => sum + Number(x.qty || 0), 0);
    last30Days.push({
      day: `${d.getMonth() + 1}/${d.getDate()}`,
      orlogo: revenue,
      shirhe: qty,
    });
  }

  const pieData = paymentRows.map(([label, v]) => ({
    name: label,
    value: v.revenue,
  }));

  const topProducts = productRows.slice(0, 8).map(([name, v]) => ({
    name: name.length > 15 ? name.slice(0, 15) + "..." : name,
    fullName: name,
    qty: v.qty,
    revenue: v.revenue,
  }));

  return (
    <div className="space-y-6">
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

      {/* === Сарын нийт === */}
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

      {/* === ГРАФИКУУД === */}
      <div className="card p-5">
        <h3 className="font-display font-600">📈 Сүүлийн 30 хоногийн орлого</h3>
        <div className="mt-4 h-64 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={last30Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2C3A5722" />
              <XAxis dataKey="day" stroke="#2C3A5799" style={{ fontSize: 11 }} />
              <YAxis stroke="#2C3A5799" style={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "#FBF7F0", border: "1px solid #2C3A5733", borderRadius: 12 }}
                formatter={(value) => [formatPrice(value), "Орлого"]}
              />
              <Line type="monotone" dataKey="orlogo" stroke="#F2A24E" strokeWidth={3} dot={{ fill: "#F2A24E", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Доод 2 chart side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pie chart — Төлбөрийн төрөл */}
        {pieData.length > 0 && (
          <div className="card p-5">
            <h3 className="font-display font-600">🥧 Төлбөрийн хуваарилалт</h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={(e) => `${e.name}`}
                    labelLine={false}
                    style={{ fontSize: 11 }}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatPrice(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Bar chart — ТОП бараа */}
        {topProducts.length > 0 && (
          <div className="card p-5">
            <h3 className="font-display font-600">🏆 ТОП 8 зарагдсан бараа</h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2C3A5722" />
                  <XAxis type="number" stroke="#2C3A5799" style={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" stroke="#2C3A5799" style={{ fontSize: 10 }} width={100} />
                  <Tooltip
                    contentStyle={{ background: "#FBF7F0", border: "1px solid #2C3A5733", borderRadius: 12 }}
                    formatter={(value, name, props) => [`${value} ширхэг`, props.payload.fullName]}
                  />
                  <Bar dataKey="qty" fill="#F2A24E" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* === САЛБАРААР === */}
      {branchRows.length > 0 && (
        <div className="card p-5">
          <h3 className="font-display font-600">🏪 Салбар бүрийн орлого</h3>
          <p className="text-xs text-ink-400 mt-1">
            Дэлгүүрийн зарагдалт салбараар хуваагдсан. Вэб захиалга энд ороогүй.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {branchRows.map(([branch, b]) => (
              <div key={branch} className="rounded-xl border border-ink/10 bg-cream/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-display font-700 text-lg">{branchLabel(branch)}</p>
                  <p className="font-display font-700 text-beak-600">{formatPrice(b.revenue)}</p>
                </div>
                <p className="text-xs text-ink-400 mb-3">{b.qty} ширхэг зарагдсан</p>
                <div className="space-y-1.5 border-t border-ink/10 pt-2">
                  {Object.entries(b.byPay)
                    .sort((a, b) => b[1].revenue - a[1].revenue)
                    .map(([pay, v]) => (
                      <div key={pay} className="flex items-center text-sm">
                        <span className="flex-1">{pay}</span>
                        <span className="text-xs text-ink-400 mr-3">{v.qty}ш</span>
                        <span className="font-display font-600">{formatPrice(v.revenue)}</span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {/* Нэгдсэн орлого */}
          <div className="mt-4 flex items-center justify-between rounded-xl bg-ink text-cream p-4">
            <span className="font-display font-700">💼 Нэгдсэн орлого (бүх салбар)</span>
            <span className="font-display font-700 text-xl">{formatPrice(shopRevenue)}</span>
          </div>
        </div>
      )}

      {/* === Төлбөрийн төрлөөр === */}
      <div className="card p-5">
        <h3 className="font-display font-600">💳 Төлбөрийн төрлөөр (нийт)</h3>
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

      {/* === Бараагаар === */}
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

      {/* === Өдөр бүрээр === */}
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

                {isOpen && (
                  <div className="border-t border-ink/10 bg-paper p-3 space-y-2">
                    {daySales.map((s) => (
                      <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-cream/40 p-2 text-sm">
                        <span className="font-semibold flex-1 min-w-[150px]">{s.product_name}</span>
                        <span className="text-xs text-ink-400">
                          {[s.size, s.color].filter(Boolean).join(" / ") || "—"} ×{s.qty}
                        </span>
                        <span className={`chip text-xs ${s.channel === "web" ? "border-blue-300 text-blue-700" : "border-beak/30 text-beak-600"}`}>
                          {s.channel === "web" ? "🌐 Вэб" : "🏪 " + branchLabel(s.branch)}
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
