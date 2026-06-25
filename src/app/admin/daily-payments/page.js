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
    if (!byDay[d]) byDay[d] = {
      payments: {}, autoPayments: {}, manualPayments: {},
      total: 0, qty: 0, count: 0,
      manualTotal: 0, manualQty: 0, manualCount: 0,
    };
    let pm = s.payment_method || "other";
    if (typeof pm === "string" && pm.startsWith("mixed:")) pm = "mixed";
    // Combined
    if (!byDay[d].payments[pm]) byDay[d].payments[pm] = { qty: 0, total: 0 };
    byDay[d].payments[pm].qty += Number(s.qty || 0);
    byDay[d].payments[pm].total += Number(s.total || 0);
    // Separate auto vs manual
    const bucket = s.is_manual ? "manualPayments" : "autoPayments";
    if (!byDay[d][bucket][pm]) byDay[d][bucket][pm] = { qty: 0, total: 0 };
    byDay[d][bucket][pm].qty += Number(s.qty || 0);
    byDay[d][bucket][pm].total += Number(s.total || 0);
    // Totals
    byDay[d].total += Number(s.total || 0);
    byDay[d].qty += Number(s.qty || 0);
    byDay[d].count++;
    if (s.is_manual) {
      byDay[d].manualTotal += Number(s.total || 0);
      byDay[d].manualQty += Number(s.qty || 0);
      byDay[d].manualCount++;
    }
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
        <div className="space-y-4">
          {days.map((d) => {
            const dayData = byDay[d];
            const date = new Date(d);
            const weekday = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"][date.getDay()];
            const autoTotal = dayData.total - dayData.manualTotal;
            const autoQty = dayData.qty - dayData.manualQty;
            return (
              <div key={d} className="card overflow-hidden">
                {/* Толгой */}
                <div className="bg-ink text-cream p-4 flex items-center justify-between">
                  <div>
                    <p className="font-display font-700 text-xl">{d}</p>
                    <p className="text-xs opacity-70">{weekday} гараг · {dayData.count} гүйлгээ</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-700 text-2xl">{formatPrice(dayData.total)}</p>
                    <p className="text-xs opacity-70">{dayData.qty} ширхэг зарагдсан</p>
                  </div>
                </div>

                {/* Автомат/Гараар хуваалт */}
                {dayData.manualCount > 0 && (
                  <div className="grid grid-cols-2 divide-x divide-ink/10 bg-cream/30 border-b border-ink/10">
                    <div className="p-3">
                      <div className="flex items-center gap-1.5 text-xs text-ink-400 mb-1">
                        <span>🤖</span>
                        <span className="font-semibold">Автомат (POS + Веб)</span>
                      </div>
                      <p className="font-display font-700 text-green-700">{formatPrice(autoTotal)}</p>
                      <p className="text-xs text-ink-400">{autoQty} ш · {dayData.count - dayData.manualCount} гүйлгээ</p>
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-1.5 text-xs text-ink-400 mb-1">
                        <span>📝</span>
                        <span className="font-semibold">Гараар оруулсан</span>
                      </div>
                      <p className="font-display font-700 text-beak-600">{formatPrice(dayData.manualTotal)}</p>
                      <p className="text-xs text-ink-400">{dayData.manualQty} ш · {dayData.manualCount} гүйлгээ</p>
                    </div>
                  </div>
                )}

                {/* Автомат төлбөрийн төрлүүд */}
                {Object.keys(dayData.autoPayments).length > 0 && (
                  <div className="p-4 border-b border-ink/5">
                    <p className="text-xs font-semibold text-green-700 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🤖</span> Автомат төлбөр (POS + Веб)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(dayData.autoPayments)
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([pm, dd]) => {
                          const pct = (dd.total / (dayData.total - dayData.manualTotal || 1)) * 100;
                          return (
                            <div key={pm} className="rounded-xl border border-green-200 bg-green-50/30 p-3">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="text-sm font-semibold">{payLabel(pm)}</p>
                                  <p className="text-xs text-ink-400 mt-0.5">{dd.qty} ширхэг</p>
                                </div>
                                <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-bold">
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                              <p className="font-display font-700 text-lg">{formatPrice(dd.total)}</p>
                              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/5">
                                <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Гараар оруулсан төлбөрийн төрлүүд */}
                {Object.keys(dayData.manualPayments).length > 0 && (
                  <div className="p-4 bg-beak-100/20">
                    <p className="text-xs font-semibold text-beak-600 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📝</span> Гараар оруулсан төлбөр
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(dayData.manualPayments)
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([pm, dd]) => {
                          const pct = (dd.total / (dayData.manualTotal || 1)) * 100;
                          return (
                            <div key={pm} className="rounded-xl border border-beak/30 bg-paper p-3">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="text-sm font-semibold">{payLabel(pm)}</p>
                                  <p className="text-xs text-ink-400 mt-0.5">{dd.qty} ширхэг</p>
                                </div>
                                <span className="rounded-full bg-beak text-ink px-2 py-0.5 text-[10px] font-bold">
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                              <p className="font-display font-700 text-lg">{formatPrice(dd.total)}</p>
                              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/5">
                                <div className="h-full bg-beak transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
