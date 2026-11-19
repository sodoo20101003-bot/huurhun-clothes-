"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, timeAgo, ORDER_STATUS } from "@/lib/utils";

const TZ = 8 * 3600000; // Улаанбаатар
const localDay = (d) => new Date(new Date(d).getTime() + TZ).toISOString().slice(0, 10);
const localMonth = (d) => localDay(d).slice(0, 7);

export default function OnlineOrders() {
  const supabase = createClient();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("today"); // today | 7d | month | all | day
  const [pickDay, setPickDay] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("order_code,customer_name,phone,address,total,payment_status,status,items,created_at")
        .order("created_at", { ascending: false })
        .range(0, 100000);
      setOrders(data || []);
      setLoading(false);
    })();
  }, []);

  const now = Date.now();
  const todayStr = localDay(now);
  const monthStr = localMonth(now);
  const last7 = new Date(now - 7 * 86400000).toISOString();

  const num = (v) => Number(v || 0);
  const paidSum = (arr) => arr.filter((o) => o.payment_status === "paid").reduce((s, o) => s + num(o.total), 0);

  // Тогтмол статистик
  const stat = useMemo(() => {
    const today = orders.filter((o) => localDay(o.created_at) === todayStr);
    const week = orders.filter((o) => o.created_at >= last7);
    const month = orders.filter((o) => localMonth(o.created_at) === monthStr);
    return {
      today: { n: today.length, rev: paidSum(today) },
      week: { n: week.length, rev: paidSum(week) },
      month: { n: month.length, rev: paidSum(month) },
    };
  }, [orders, todayStr, monthStr, last7]);

  // Шүүсэн жагсаалт
  const filtered = useMemo(() => {
    if (range === "day" && pickDay) return orders.filter((o) => localDay(o.created_at) === pickDay);
    if (range === "today") return orders.filter((o) => localDay(o.created_at) === todayStr);
    if (range === "7d") return orders.filter((o) => o.created_at >= last7);
    if (range === "month") return orders.filter((o) => localMonth(o.created_at) === monthStr);
    return orders;
  }, [orders, range, pickDay, todayStr, monthStr, last7]);

  const fRev = paidSum(filtered);
  const fPending = filtered.filter((o) => o.payment_status !== "paid").length;

  const rangeLabel = range === "day" && pickDay ? pickDay
    : range === "today" ? "Өнөөдөр"
    : range === "7d" ? "Сүүлийн 7 хоног"
    : range === "month" ? "Энэ сар" : "Бүх цаг үе";

  const StatCard = ({ title, n, rev, accent }) => (
    <div className="card p-5">
      <p className="text-xs text-ink-400">{title}</p>
      <p className="mt-1 font-display text-2xl font-700">{n} <span className="text-sm font-500 text-ink-400">захиалга</span></p>
      <p className={`mt-1 font-display font-600 ${accent || "text-beak-600"}`}>{formatPrice(rev)}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-700">🌐 Онлайн захиалга</h2>
        <p className="text-sm text-ink-400 mt-1">Вэбээр ирсэн захиалгын тоо, орлого, огноогоор шүүх.</p>
      </div>

      {/* Статистик */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard title="📅 Өнөөдөр" n={stat.today.n} rev={stat.today.rev} />
        <StatCard title="🗓 Сүүлийн 7 хоног" n={stat.week.n} rev={stat.week.rev} />
        <StatCard title="📆 Энэ сар" n={stat.month.n} rev={stat.month.rev} />
      </div>

      {/* Шүүлтүүр */}
      <div className="card p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { v: "today", l: "Өнөөдөр" },
            { v: "7d", l: "7 хоног" },
            { v: "month", l: "Энэ сар" },
            { v: "all", l: "Бүгд" },
          ].map((r) => (
            <button key={r.v} onClick={() => { setRange(r.v); setPickDay(""); }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${range === r.v ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"}`}>
              {r.l}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm text-ink-400">Тодорхой өдөр:</label>
            <input type="date" value={pickDay}
              onChange={(e) => { setPickDay(e.target.value); setRange(e.target.value ? "day" : "today"); }}
              className="rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="font-semibold">{rangeLabel}:</span>
          <span>{filtered.length} захиалга</span>
          <span className="text-green-600 font-semibold">💰 {formatPrice(fRev)} (төлсөн)</span>
          {fPending > 0 && <span className="text-beak-600">⏳ {fPending} хүлээгдэж буй</span>}
        </div>
      </div>

      {/* Жагсаалт */}
      {loading ? (
        <p className="text-ink-400">Ачаалж байна...</p>
      ) : (
        <div className="card divide-y divide-ink/5">
          {filtered.map((o) => (
            <div key={o.order_code} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm">
              <span className="font-mono font-bold">#{o.order_code}</span>
              <span className="font-medium">{o.customer_name}</span>
              <span className="text-ink-400">{o.phone}</span>
              <span className="text-xs text-ink-400">⏱ {timeAgo(o.created_at)}</span>
              <span className="ml-auto font-display font-600">{formatPrice(o.total)}</span>
              <span className={`chip text-xs ${o.payment_status === "paid" ? "border-green-500 text-green-700" : "border-beak text-beak-600"}`}>
                {o.payment_status === "paid" ? "✓ Төлсөн" : "⏳ Хүлээгдэж буй"}
              </span>
              <span className="chip text-xs border-ink/20 text-ink-400">{ORDER_STATUS[o.status] || o.status}</span>
            </div>
          ))}
          {filtered.length === 0 && <p className="p-6 text-center text-sm text-ink-400">Энэ хугацаанд захиалга алга.</p>}
        </div>
      )}
    </div>
  );
}
