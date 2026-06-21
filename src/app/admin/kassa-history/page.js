"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";

const PAY_LABELS = {
  cash: "💵 Бэлэн", card: "💳 Карт", pocket: "📱 Pocket",
  storepay: "🛍 StorePay", dans: "🏦 Данс", qpay: "QPay",
};
const BRANCH_LABELS = { branch1: "Салбар 1", branch2: "Салбар 2" };

function payLabel(m) {
  if (!m) return "Бусад";
  if (m.startsWith("mixed:")) return "🔀 Холимог";
  return PAY_LABELS[m] || m;
}

function dayKey(d) {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function timeStr(d) {
  const date = new Date(d);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function KassaHistoryPage() {
  const supabase = createClient();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState(null);
  const [deletingCode, setDeletingCode] = useState(null);

  function loadData() {
    setLoading(true);
    supabase
      .from("sales")
      .select("*")
      .eq("channel", "shop")
      .order("created_at", { ascending: false })
      .limit(1000)
      .then(({ data }) => {
        setSales(data || []);
        setLoading(false);
      });
  }

  useEffect(() => { loadData(); }, []);

  async function deleteTransaction(order_code, total) {
    const password = prompt(
      `⚠️ Уг зарагдалтыг бүхэлд нь УСТГАХ уу?\n\n` +
      `Код: #${order_code}\n` +
      `Нийт: ${total}₮\n\n` +
      `Үлдэгдэл буцаагдана.\n\n` +
      `Админ нууц үг оруулна уу:`
    );
    if (!password) return;
    setDeletingCode(order_code);
    const res = await fetch("/api/kassa-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_code, password }),
    });
    const data = await res.json();
    setDeletingCode(null);
    if (!res.ok) return alert(data.error || "Алдаа");
    alert(`✅ Устгагдсан\n${data.deleted_count} мөр устсан\n${data.restored_qty} ширхэг үлдэгдэлд буцсан`);
    loadData();
  }

  if (loading) return <p className="text-ink-400">Ачаалж байна...</p>;

  // Гүйлгээгээр бүлэглэх (order_code-аар)
  const byTransaction = {};
  for (const s of sales) {
    const key = s.order_code || `single-${s.id}`;
    if (!byTransaction[key]) {
      byTransaction[key] = {
        order_code: s.order_code,
        created_at: s.created_at,
        payment_method: s.payment_method,
        branch: s.branch,
        items: [],
        total: 0,
        qty: 0,
      };
    }
    byTransaction[key].items.push(s);
    byTransaction[key].total += Number(s.total || 0);
    byTransaction[key].qty += Number(s.qty || 0);
  }

  // Өдрөөр бүлэглэх
  const byDay = {};
  for (const tx of Object.values(byTransaction)) {
    const day = dayKey(tx.created_at);
    if (!byDay[day]) byDay[day] = { transactions: [], total: 0, qty: 0, count: 0 };
    byDay[day].transactions.push(tx);
    byDay[day].total += tx.total;
    byDay[day].qty += tx.qty;
    byDay[day].count++;
  }
  const dayKeys = Object.keys(byDay).sort().reverse();

  // Гүйлгээнүүдийг цагаар нь эрэмбэлэх (шинэ нь дээр)
  for (const day of dayKeys) {
    byDay[day].transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  const grandTotal = sales.reduce((s, x) => s + Number(x.total || 0), 0);
  const grandQty = sales.reduce((s, x) => s + Number(x.qty || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-700">📋 Кассын түүх</h2>
        <div className="text-sm text-ink-400">
          Нийт: <b className="text-green-600">{grandQty}</b> ширхэг · <b className="text-beak-600">{formatPrice(grandTotal)}</b>
        </div>
      </div>

      {sales.length === 0 ? (
        <div className="card p-10 text-center text-ink-400">
          <div className="text-4xl mb-2">📋</div>
          <p>Кассын зарагдалт алга байна</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayKeys.map((day) => {
            const dayData = byDay[day];
            const isOpen = expandedDay === day;
            return (
              <div key={day} className="card overflow-hidden">
                <button
                  onClick={() => setExpandedDay(isOpen ? null : day)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-cream/50 transition"
                >
                  <span className="text-lg">{isOpen ? "▼" : "▶"}</span>
                  <div className="flex-1">
                    <p className="font-display font-700">{day}</p>
                    <p className="text-xs text-ink-400">
                      {dayData.count} гүйлгээ · {dayData.qty} ширхэг
                    </p>
                  </div>
                  <p className="font-display font-700 text-beak-600">{formatPrice(dayData.total)}</p>
                </button>

                {isOpen && (
                  <div className="border-t border-ink/10 bg-cream/30 p-3 space-y-2">
                    {dayData.transactions.map((tx, idx) => (
                      <div key={tx.order_code || idx} className="rounded-lg bg-paper border border-ink/10 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold bg-ink text-cream px-2 py-1 rounded">
                              🕐 {timeStr(tx.created_at)}
                            </span>
                            <span className="text-xs text-ink-400">#{tx.order_code || "—"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="font-display font-700 text-beak-600">{formatPrice(tx.total)}</p>
                            {tx.order_code && (
                              <button
                                onClick={() => deleteTransaction(tx.order_code, tx.total)}
                                disabled={deletingCode === tx.order_code}
                                className="ml-1 grid h-7 w-7 place-items-center rounded-md text-red-500 hover:bg-red-50 transition disabled:opacity-30"
                                title="Зарагдалтыг бүхэлд нь устгах"
                              >
                                {deletingCode === tx.order_code ? "…" : "🗑"}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1 mb-2">
                          {tx.items.map((it, j) => (
                            <div key={j} className="flex items-center gap-2 text-sm">
                              <span className="flex-1">
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

                        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-ink/5">
                          <span className="chip text-xs border-ink/20">{payLabel(tx.payment_method)}</span>
                          {tx.branch && (
                            <span className="chip text-xs border-beak/30 text-beak-600">🏪 {BRANCH_LABELS[tx.branch] || tx.branch}</span>
                          )}
                          <span className="ml-auto text-xs text-ink-400">{tx.qty} ширхэг</span>
                        </div>
                      </div>
                    ))}
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
