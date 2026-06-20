"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";

const PAY_LABELS = {
  cash: "💵 Бэлэн", card: "💳 Карт", pocket: "📱 Pocket",
  storepay: "🛍 StorePay", dans: "🏦 Данс", transfer: "🏦 Шилжүүлэг",
  qpay: "QPay", mixed: "🔀 Холимог",
};
const BRANCH_LABELS = { branch1: "🏪 Салбар 1", branch2: "🏪 Салбар 2" };

function payLabel(m) {
  if (!m) return "❓ Бусад";
  if (typeof m === "string" && m.startsWith("mixed:")) return PAY_LABELS.mixed;
  return PAY_LABELS[m] || m;
}

function dayKey(d) {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function DailyPaymentsPage() {
  const supabase = createClient();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBranch, setActiveBranch] = useState("all");

  useEffect(() => {
    supabase.from("sales")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5000)
      .then(({ data }) => {
        setSales(data || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-ink-400">Ачаалж байна...</p>;

  // Branch filter
  const filtered = activeBranch === "all"
    ? sales
    : sales.filter((s) => s.branch === activeBranch);

  // Өдрөөр + төлбөрөөр бүлэглэх
  const byDay = {};
  for (const s of filtered) {
    const d = dayKey(s.created_at);
    if (!byDay[d]) byDay[d] = { payments: {}, total: 0, qty: 0, count: 0 };
    let pm = s.payment_method || "other";
    if (typeof pm === "string" && pm.startsWith("mixed:")) pm = "mixed";
    if (!byDay[d].payments[pm]) byDay[d].payments[pm] = { qty: 0, total: 0 };
    byDay[d].payments[pm].qty += Number(s.qty || 0);
    byDay[d].payments[pm].total += Number(s.total || 0);
    byDay[d].total += Number(s.total || 0);
    byDay[d].qty += Number(s.qty || 0);
    byDay[d].count++;
  }
  const days = Object.keys(byDay).sort().reverse();

  const grandTotal = filtered.reduce((s, x) => s + Number(x.total || 0), 0);
  const grandQty = filtered.reduce((s, x) => s + Number(x.qty || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-700">📅 Өдөр бүрд төлбөрийн төрлөөр</h2>
          <p className="text-sm text-ink-400 mt-1">Тус бүрд "Бэлэн, Карт, Данс..." гэх мэт хэдэн ширхэг + хэдэн төгрөг</p>
        </div>
        <div className="text-sm">
          <span className="text-ink-400">Нийт:</span>{" "}
          <b className="text-green-600">{grandQty}</b> ш ·{" "}
          <b className="text-beak-600">{formatPrice(grandTotal)}</b>
        </div>
      </div>

      {/* Branch filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveBranch("all")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            activeBranch === "all" ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"
          }`}
        >
          Бүгд
        </button>
        {Object.entries(BRANCH_LABELS).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setActiveBranch(v)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              activeBranch === v ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {days.length === 0 ? (
        <div className="card p-10 text-center text-ink-400">
          <div className="text-4xl mb-2">📅</div>
          <p>Өгөгдөл алга байна</p>
        </div>
      ) : (
        <div className="space-y-3">
          {days.map((d) => {
            const dayData = byDay[d];
            const date = new Date(d);
            const weekday = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"][date.getDay()];
            return (
              <div key={d} className="card p-4">
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-ink/10">
                  <div>
                    <p className="font-display font-700 text-lg">{d}</p>
                    <p className="text-xs text-ink-400">{weekday} · {dayData.count} гүйлгээ</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-700 text-xl text-beak-600">{formatPrice(dayData.total)}</p>
                    <p className="text-xs text-ink-400">{dayData.qty} ширхэг</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(dayData.payments)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([pm, d]) => {
                      const pct = (d.total / dayData.total) * 100;
                      return (
                        <div key={pm} className="rounded-lg bg-cream/50 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold">{payLabel(pm)}</span>
                            <span className="text-xs text-ink-400">{pct.toFixed(0)}%</span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-ink-400">{d.qty} ширхэг</span>
                            <span className="font-display font-700 text-sm">{formatPrice(d.total)}</span>
                          </div>
                          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-ink/5">
                            <div className="h-full bg-beak" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
