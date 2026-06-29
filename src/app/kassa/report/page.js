"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

const PAY_LABELS = {
  cash: "Бэлэн", card: "Карт", pocket: "Pocket",
  storepay: "StorePay", dans: "Данс", transfer: "Шилжүүлэг",
  qpay: "QPay",
};
const BRANCH_LABELS = { branch1: "Салбар 1", branch2: "Салбар 2" };
const payLabel = (m) => (!m ? "Бусад" : PAY_LABELS[m] || m);

function dayKey(d) {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function timeStr(d) {
  const dt = new Date(d);
  return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

function paymentSummary(s) {
  const pm = s.payment_method;
  if (typeof pm === "string" && pm.startsWith("mixed:") && Array.isArray(s.payments)) {
    return s.payments
      .filter((p) => Number(p.amount) > 0)
      .map((p) => `${payLabel(p.method)} ${formatPrice(Number(p.amount))}`)
      .join(" + ");
  }
  return payLabel(pm);
}

function flattenSales(sales) {
  const result = [];
  for (const s of sales) {
    const pm = s.payment_method;
    if (typeof pm === "string" && pm.startsWith("mixed:") && Array.isArray(s.payments) && s.payments.length > 0) {
      const sorted = [...s.payments].sort((a, b) => Number(b.amount) - Number(a.amount));
      sorted.forEach((p, idx) => {
        result.push({
          ...s, payment_method: p.method, total: Number(p.amount),
          _aggregateQty: idx === 0 ? Number(s.qty || 0) : 0,
          _origQty: Number(s.qty || 0), _split: true,
        });
      });
    } else {
      result.push({ ...s, _aggregateQty: Number(s.qty || 0), _origQty: Number(s.qty || 0) });
    }
  }
  return result;
}

export default function KassaReportPage() {
  const supabase = createClient();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBranch, setActiveBranch] = useState("all");
  const [viewMode, setViewMode] = useState("transactions");
  const [expanded, setExpanded] = useState({});
  const [expandedDay, setExpandedDay] = useState(null);

  useEffect(() => {
    supabase.from("sales")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10000)
      .then(({ data }) => {
        setSales(data || []);
        setLoading(false);
        if (data?.length) setExpandedDay(dayKey(data[0].created_at));
      });
  }, []);

  if (loading) return <p className="p-4 text-ink-400">Ачаалж байна...</p>;

  const filtered = activeBranch === "all" ? sales : sales.filter((s) => s.branch === activeBranch);

  const byDayTx = {};
  for (const s of filtered) {
    const d = dayKey(s.created_at);
    if (!byDayTx[d]) byDayTx[d] = { transactions: {}, total: 0, qty: 0, manualTotal: 0, manualQty: 0, manualTxCount: 0 };
    const key = s.order_code || `single-${s.id}`;
    if (!byDayTx[d].transactions[key]) {
      byDayTx[d].transactions[key] = {
        order_code: s.order_code, created_at: s.created_at,
        payment_method: s.payment_method, payments: s.payments,
        branch: s.branch, is_manual: s.is_manual,
        items: [], total: 0, qty: 0,
      };
    }
    byDayTx[d].transactions[key].items.push(s);
    byDayTx[d].transactions[key].total += Number(s.total || 0);
    byDayTx[d].transactions[key].qty += Number(s.qty || 0);
    byDayTx[d].total += Number(s.total || 0);
    byDayTx[d].qty += Number(s.qty || 0);
    if (s.is_manual) {
      byDayTx[d].manualTotal += Number(s.total || 0);
      byDayTx[d].manualQty += Number(s.qty || 0);
    }
  }
  for (const d of Object.keys(byDayTx)) {
    byDayTx[d].txCount = Object.keys(byDayTx[d].transactions).length;
    byDayTx[d].manualTxCount = Object.values(byDayTx[d].transactions).filter(t => t.is_manual).length;
  }

  const flattened = flattenSales(filtered);
  const byDayPay = {};
  for (const s of flattened) {
    const d = dayKey(s.created_at);
    if (!byDayPay[d]) byDayPay[d] = { branches: {} };
    const branch = s.branch || "branch1";
    if (!byDayPay[d].branches[branch]) byDayPay[d].branches[branch] = { payments: {} };
    const pm = s.payment_method || "other";
    if (!byDayPay[d].branches[branch].payments[pm]) byDayPay[d].branches[branch].payments[pm] = { qty: 0, total: 0, items: [] };
    byDayPay[d].branches[branch].payments[pm].qty += s._aggregateQty;
    byDayPay[d].branches[branch].payments[pm].total += Number(s.total || 0);
    byDayPay[d].branches[branch].payments[pm].items.push(s);
  }

  const days = Object.keys(byDayTx).sort().reverse();
  const grandTotal = filtered.reduce((s, x) => s + Number(x.total || 0), 0);
  const grandQty = filtered.reduce((s, x) => s + Number(x.qty || 0), 0);
  const toggle = (k) => setExpanded((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-700">📅 Тайлан</h2>
        <Link href="/kassa" className="text-sm text-ink-400 hover:text-ink">← POS руу</Link>
      </div>

      <div className="card p-4 space-y-3">
        <div>
          <p className="text-xs text-ink-400">Нийт зарагдалт</p>
          <p className="font-display font-700 text-2xl">
            <span className="text-green-600">{grandQty} ш</span>
            <span className="text-ink-400 mx-2">·</span>
            <span className="text-beak-600">{formatPrice(grandTotal)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex rounded-full bg-cream p-1">
            <button onClick={() => setViewMode("transactions")}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${viewMode === "transactions" ? "bg-ink text-cream" : "text-ink hover:bg-paper"}`}>
              🧾 Гүйлгээгээр
            </button>
            <button onClick={() => setViewMode("payments")}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${viewMode === "payments" ? "bg-ink text-cream" : "text-ink hover:bg-paper"}`}>
              💳 Төлбөрөөр
            </button>
          </div>
          <span className="text-ink-400">·</span>
          <div className="flex rounded-full bg-cream p-1">
            <button onClick={() => setActiveBranch("all")}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${activeBranch === "all" ? "bg-ink text-cream" : "text-ink hover:bg-paper"}`}>Бүгд</button>
            {Object.entries(BRANCH_LABELS).map(([v, l]) => (
              <button key={v} onClick={() => setActiveBranch(v)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${activeBranch === v ? "bg-ink text-cream" : "text-ink hover:bg-paper"}`}>🏪 {l}</button>
            ))}
          </div>
        </div>
      </div>

      {days.length === 0 ? (
        <div className="card p-10 text-center text-ink-400">
          <div className="text-4xl mb-2">📅</div>
          <p>Өгөгдөл алга байна</p>
        </div>
      ) : (
        <div className="space-y-3">
          {days.map((d) => {
            const dayTx = byDayTx[d];
            const dayPay = byDayPay[d];
            const date = new Date(d);
            const weekday = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"][date.getDay()];
            const isOpen = expandedDay === d;
            return (
              <div key={d} className="card overflow-hidden">
                <button onClick={() => setExpandedDay(isOpen ? null : d)}
                  className="w-full bg-ink text-cream p-4 flex items-center justify-between hover:opacity-90 transition">
                  <div className="text-left">
                    <p className="font-display font-700 text-lg">{d}</p>
                    <p className="text-xs opacity-70">{weekday} гараг · {dayTx.txCount} гүйлгээ</p>
                    {dayTx.manualTxCount > 0 && (
                      <p className="text-xs text-beak mt-0.5">📝 Гараар: {dayTx.manualTxCount}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-display font-700 text-xl">{formatPrice(dayTx.total)}</p>
                    <p className="text-xs opacity-70">{dayTx.qty} ширхэг</p>
                    <p className="text-xs opacity-60 mt-1">{isOpen ? "▲ Хаах" : "▼ Дэлгэрэнгүй"}</p>
                  </div>
                </button>

                {isOpen && viewMode === "transactions" && (
                  <div className="p-3 space-y-2 bg-cream/20">
                    {Object.values(dayTx.transactions)
                      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                      .map((tx, idx) => (
                        <div key={tx.order_code || idx} className="rounded-lg bg-paper p-3 border border-ink/5">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono font-bold bg-ink text-cream px-2 py-0.5 rounded">
                                🕐 {timeStr(tx.created_at)}
                              </span>
                              <span className="text-xs text-ink-400">#{tx.order_code || "—"}</span>
                              {tx.is_manual && (
                                <span className="text-[10px] font-bold bg-beak-100 text-beak-600 px-2 py-0.5 rounded-full">
                                  📝 Гараар
                                </span>
                              )}
                            </div>
                            <p className="font-display font-700 text-beak-600">{formatPrice(tx.total)}</p>
                          </div>
                          <div className="space-y-0.5 mb-2">
                            {tx.items.map((it, j) => (
                              <div key={j} className="flex items-center gap-2 text-sm">
                                <span className="flex-1 truncate">
                                  <b>{it.product_name}</b>
                                  {(it.size || it.color) && (
                                    <span className="text-xs text-ink-400 ml-1">
                                      ({[it.size, it.color].filter(Boolean).join(" / ")})
                                    </span>
                                  )}
                                </span>
                                <span className="text-xs text-ink-400">×{it.qty}</span>
                                <span className="text-sm font-display font-600 w-20 text-right">{formatPrice(it.total)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-ink/5 items-center">
                            <span className="rounded-full bg-cream border border-ink/15 px-2 py-0.5 text-xs font-semibold">
                              💳 {paymentSummary(tx)}
                            </span>
                            {tx.branch && (
                              <span className="rounded-full bg-beak-100 border border-beak/30 text-beak-600 px-2 py-0.5 text-xs font-semibold">
                                🏪 {tx.branch === "branch1" ? "Салбар 1" : "Салбар 2"}
                              </span>
                            )}
                            <span className="ml-auto text-xs text-ink-400">{tx.qty} ширхэг</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {isOpen && viewMode === "payments" && (
                  <div className="bg-cream/20">
                    {(activeBranch === "all" ? ["branch1", "branch2"] : [activeBranch]).map((branchKey) => {
                      const branchData = dayPay.branches[branchKey];
                      if (!branchData || Object.keys(branchData.payments).length === 0) return null;
                      const branchTotal = Object.values(branchData.payments).reduce((s, p) => s + p.total, 0);
                      const branchQty = Object.values(branchData.payments).reduce((s, p) => s + p.qty, 0);
                      return (
                        <div key={branchKey} className="border-b border-ink/5 last:border-0">
                          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wider">🏪 {BRANCH_LABELS[branchKey]}</p>
                            <p className="text-xs font-bold">
                              <span className="text-green-600">{branchQty} ш</span>
                              <span className="text-ink-400 mx-1.5">·</span>
                              <span className="text-beak-600">{formatPrice(branchTotal)}</span>
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 pt-0">
                            {Object.entries(branchData.payments).sort((a, b) => b[1].total - a[1].total).map(([pm, data]) => {
                              const pct = branchTotal > 0 ? (data.total / branchTotal) * 100 : 0;
                              const key = `${d}_${branchKey}_${pm}`;
                              const isPayOpen = expanded[key];
                              return (
                                <div key={pm} className="rounded-xl border border-ink/10 bg-paper overflow-hidden">
                                  <button onClick={() => toggle(key)} className="w-full p-3 hover:bg-cream/30 transition text-left">
                                    <div className="flex items-start justify-between mb-2">
                                      <div>
                                        <p className="text-sm font-bold">{payLabel(pm)}</p>
                                        <p className="text-xs text-ink-400 mt-0.5">{data.qty} ш</p>
                                      </div>
                                      <span className="rounded-full bg-beak-100 text-beak-600 px-2 py-0.5 text-[10px] font-bold">{pct.toFixed(0)}%</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <p className="font-display font-700 text-lg">{formatPrice(data.total)}</p>
                                      <span className="text-ink-400 text-xs">{isPayOpen ? "▲" : "▼"}</span>
                                    </div>
                                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/5">
                                      <div className="h-full bg-beak transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                  </button>
                                  {isPayOpen && (
                                    <div className="border-t border-ink/10 bg-cream/30 p-3 space-y-1.5">
                                      {data.items.map((it, i) => (
                                        <div key={i} className="flex items-start justify-between gap-2 text-xs py-1 border-b border-ink/5 last:border-0">
                                          <div className="flex-1 min-w-0">
                                            <p className="font-semibold truncate">{it.product_name || "—"}</p>
                                            {(it.size || it.color) && (
                                              <p className="text-ink-400 text-[10px]">{[it.size, it.color].filter(Boolean).join(" / ")}</p>
                                            )}
                                            {it._split && (
                                              <span className="inline-block mt-0.5 rounded-full bg-beak-100 text-beak-600 px-1.5 py-0.5 text-[9px] font-semibold">
                                                ⚡ Хосолсон
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-right shrink-0">
                                            <p className="text-ink-400">×{it._origQty}</p>
                                            <p className="font-semibold">{formatPrice(it.total)}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
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
          })}
        </div>
      )}
    </div>
  );
}
