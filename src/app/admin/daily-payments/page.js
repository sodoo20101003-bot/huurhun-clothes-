"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";

const PAY_LABELS = {
  cash: "Бэлэн", card: "Карт", pocket: "Pocket",
  storepay: "StorePay", dans: "Данс", transfer: "Шилжүүлэг",
  qpay: "QPay", mixed: "🔀 Холимог",
};
const BRANCH_LABELS = { branch1: "Салбар 1", branch2: "Салбар 2" };
const payLabel = (m) => (!m ? "Бусад" : PAY_LABELS[m] || m);

function dayKey(d) {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function DailyPaymentsPage() {
  const supabase = createClient();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBranch, setActiveBranch] = useState("all");
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    supabase.from("sales")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10000)
      .then(({ data }) => {
        setSales(data || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-ink-400">Ачаалж байна...</p>;

  const filtered = activeBranch === "all" ? sales : sales.filter((s) => s.branch === activeBranch);

  // Хосолсон гүйлгээг задлахгүй, "mixed" ангилалд оруулаад дотоод breakdown-той харуулна
  const byDay = {};
  for (const s of filtered) {
    const d = dayKey(s.created_at);
    if (!byDay[d]) byDay[d] = {
      branches: {}, total: 0, qty: 0, count: 0,
      manualTotal: 0, manualQty: 0, manualCount: 0,
    };
    const branch = s.branch || "branch1";
    if (!byDay[d].branches[branch]) byDay[d].branches[branch] = { payments: {}, mixedBreakdown: {} };
    const pm = s.payment_method || "other";
    const isMixed = typeof pm === "string" && pm.startsWith("mixed:");
    const bucket = isMixed ? "mixed" : pm;
    if (!byDay[d].branches[branch].payments[bucket]) {
      byDay[d].branches[branch].payments[bucket] = { qty: 0, total: 0, items: [] };
    }
    byDay[d].branches[branch].payments[bucket].qty += Number(s.qty || 0);
    byDay[d].branches[branch].payments[bucket].total += Number(s.total || 0);
    byDay[d].branches[branch].payments[bucket].items.push(s);
    if (isMixed && Array.isArray(s.payments)) {
      const paymentsSum = s.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const itemTotal = Number(s.total || 0);
      const ratio = paymentsSum > 0 ? itemTotal / paymentsSum : 0;
      for (const p of s.payments) {
        const portion = Math.round(Number(p.amount || 0) * ratio);
        if (!byDay[d].branches[branch].mixedBreakdown[p.method]) byDay[d].branches[branch].mixedBreakdown[p.method] = 0;
        byDay[d].branches[branch].mixedBreakdown[p.method] += portion;
      }
    }
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
  const toggle = (k) => setExpanded((p) => ({ ...p, [k]: !p[k] }));

  function PaymentCard({ pm, data, branchTotal, expandKey, mixedBreakdown }) {
    const pct = branchTotal > 0 ? (data.total / branchTotal) * 100 : 0;
    const isOpen = expanded[expandKey];
    return (
      <div className="rounded-xl border border-ink/10 bg-paper overflow-hidden">
        <button onClick={() => toggle(expandKey)} className="w-full p-3 hover:bg-cream/30 transition text-left">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-bold">{payLabel(pm)}</p>
              <p className="text-xs text-ink-400 mt-0.5">{data.qty} ширхэг</p>
            </div>
            <span className="rounded-full bg-beak-100 text-beak-600 px-2 py-0.5 text-[10px] font-bold">{pct.toFixed(0)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <p className="font-display font-700 text-lg">{formatPrice(data.total)}</p>
            <span className="text-ink-400 text-xs">{isOpen ? "▲ Хаах" : "▼ Дэлгэрэнгүй"}</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/5">
            <div className="h-full bg-beak transition-all" style={{ width: `${pct}%` }} />
          </div>
        </button>
        {isOpen && (
          <div className="border-t border-ink/10 bg-cream/30 p-3 space-y-1.5">
            {pm === "mixed" && mixedBreakdown && Object.keys(mixedBreakdown).length > 0 && (
              <div className="mb-2 p-2 rounded-lg bg-beak-100/50 border border-beak/30">
                <p className="text-[10px] font-bold text-beak-600 uppercase mb-1">Төлбөрийн задаргаа</p>
                <div className="space-y-0.5">
                  {Object.entries(mixedBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([method, amount]) => (
                      <div key={method} className="flex justify-between text-xs">
                        <span className="text-ink">{payLabel(method)}</span>
                        <span className="font-bold text-beak-600">{formatPrice(amount)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
            {data.items.length === 0 ? (
              <p className="text-xs text-ink-400 text-center">Бараа байхгүй</p>
            ) : data.items.map((it, i) => (
              <div key={i} className="flex items-start justify-between gap-2 text-xs py-1 border-b border-ink/5 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{it.product_name || "—"}</p>
                  {(it.size || it.color) && (
                    <p className="text-ink-400 text-[10px]">{[it.size, it.color].filter(Boolean).join(" / ")}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-ink-400">×{it.qty}</p>
                  <p className="font-semibold">{formatPrice(it.total)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function BranchSection({ branch, label, branchData }) {
    if (!branchData || Object.keys(branchData.payments).length === 0) return null;
    const branchTotal = Object.values(branchData.payments).reduce((s, p) => s + p.total, 0);
    const branchQty = Object.values(branchData.payments).reduce((s, p) => s + p.qty, 0);
    return (
      <div className="border-t border-ink/5">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-ink">🏪 {label}</p>
          <p className="text-xs font-bold">
            <span className="text-green-600">{branchQty} ш</span>
            <span className="text-ink-400 mx-1.5">·</span>
            <span className="text-beak-600">{formatPrice(branchTotal)}</span>
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4 pt-0">
          {Object.entries(branchData.payments)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([pm, data]) => (
              <PaymentCard key={pm} pm={pm} data={data} branchTotal={branchTotal}
                expandKey={`${branch}_${pm}_${branchTotal}`} mixedBreakdown={branchData.mixedBreakdown} />
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-700">📅 Өдөр бүрд төлбөрийн төрлөөр</h2>
          <p className="text-sm text-ink-400 mt-1">Холимог гүйлгээг тус тусын төлбөрөөр задалсан</p>
        </div>
        <div className="text-sm">
          <span className="text-ink-400">Нийт:</span>{" "}
          <b className="text-green-600">{grandQty}</b> ш ·{" "}
          <b className="text-beak-600">{formatPrice(grandTotal)}</b>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setActiveBranch("all")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${activeBranch === "all" ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"}`}>Бүгд</button>
        {Object.entries(BRANCH_LABELS).map(([v, l]) => (
          <button key={v} onClick={() => setActiveBranch(v)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${activeBranch === v ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"}`}>🏪 {l}</button>
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

                {dayData.manualCount > 0 && (
                  <div className="grid grid-cols-2 divide-x divide-ink/10 bg-cream/30 border-b border-ink/10">
                    <div className="p-3">
                      <p className="text-xs text-ink-400 mb-1 font-semibold">🤖 Автомат (POS + Веб)</p>
                      <p className="font-display font-700 text-green-700">{formatPrice(autoTotal)}</p>
                      <p className="text-xs text-ink-400">{autoQty} ш · {dayData.count - dayData.manualCount} гүйлгээ</p>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-ink-400 mb-1 font-semibold">📝 Гараар оруулсан</p>
                      <p className="font-display font-700 text-beak-600">{formatPrice(dayData.manualTotal)}</p>
                      <p className="text-xs text-ink-400">{dayData.manualQty} ш · {dayData.manualCount} гүйлгээ</p>
                    </div>
                  </div>
                )}

                {activeBranch === "all" ? (
                  <>
                    <BranchSection branch="branch1" label="Салбар 1" branchData={dayData.branches.branch1} />
                    <BranchSection branch="branch2" label="Салбар 2" branchData={dayData.branches.branch2} />
                  </>
                ) : (
                  <BranchSection branch={activeBranch} label={BRANCH_LABELS[activeBranch]} branchData={dayData.branches[activeBranch]} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
