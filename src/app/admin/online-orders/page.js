"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, timeAgo } from "@/lib/utils";

const TZ = 8 * 3600000; // Улаанбаатар
const localDay = (d) => new Date(new Date(d).getTime() + TZ).toISOString().slice(0, 10);
const localMonth = (d) => localDay(d).slice(0, 7);

const STATUS_LABELS = {
  pending: "⏳ Хүлээгдэж буй",
  preparing: "📦 Бэлдэж байна",
  out_for_delivery: "🚛 Хүргэлтэд гарсан",
  shipped: "🚚 Хүргэгдсэн",
  cancelled: "❌ Цуцалсан",
};

export default function OnlineOrders() {
  const supabase = createClient();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("today"); // today | 7d | month | all | day
  const [pickDay, setPickDay] = useState("");
  const [pay, setPay] = useState("all"); // all | paid | unpaid
  const [statusF, setStatusF] = useState("all"); // all | <status>
  const [openId, setOpenId] = useState(null);

  async function load() {
    const [{ data: o }, { data: p }] = await Promise.all([
      supabase.from("orders")
        .select("order_code,customer_name,phone,address,note,total,payment_status,status,items,created_at")
        .order("created_at", { ascending: false }).range(0, 100000),
      supabase.from("products").select("id,name,images").range(0, 100000),
    ]);
    const map = {};
    for (const x of (p || [])) map[x.id] = x;
    setProducts(map);
    setOrders(o || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(code, status) {
    await supabase.from("orders").update({ status }).eq("order_code", code);
    setOrders((prev) => prev.map((o) => o.order_code === code ? { ...o, status } : o));
  }
  async function togglePaid(code, current) {
    const next = current === "paid" ? "pending" : "paid";
    await supabase.from("orders").update({ payment_status: next }).eq("order_code", code);
    setOrders((prev) => prev.map((o) => o.order_code === code ? { ...o, payment_status: next } : o));
  }

  const now = Date.now();
  const todayStr = localDay(now);
  const monthStr = localMonth(now);
  const last7 = new Date(now - 7 * 86400000).toISOString();

  const num = (v) => Number(v || 0);
  const paidSum = (arr) => arr.filter((o) => o.payment_status === "paid").reduce((s, o) => s + num(o.total), 0);

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

  const filtered = useMemo(() => {
    let arr = orders;
    if (range === "day" && pickDay) arr = arr.filter((o) => localDay(o.created_at) === pickDay);
    else if (range === "today") arr = arr.filter((o) => localDay(o.created_at) === todayStr);
    else if (range === "7d") arr = arr.filter((o) => o.created_at >= last7);
    else if (range === "month") arr = arr.filter((o) => localMonth(o.created_at) === monthStr);
    if (pay === "paid") arr = arr.filter((o) => o.payment_status === "paid");
    else if (pay === "unpaid") arr = arr.filter((o) => o.payment_status !== "paid");
    if (statusF !== "all") arr = arr.filter((o) => (o.status || "pending") === statusF);
    return arr;
  }, [orders, range, pickDay, pay, statusF, todayStr, monthStr, last7]);

  // Төлөв бүрийн тоо (огноо + төлбөрийн шүүлтийн дотор)
  const statusCounts = useMemo(() => {
    let base = orders;
    if (range === "day" && pickDay) base = base.filter((o) => localDay(o.created_at) === pickDay);
    else if (range === "today") base = base.filter((o) => localDay(o.created_at) === todayStr);
    else if (range === "7d") base = base.filter((o) => o.created_at >= last7);
    else if (range === "month") base = base.filter((o) => localMonth(o.created_at) === monthStr);
    if (pay === "paid") base = base.filter((o) => o.payment_status === "paid");
    else if (pay === "unpaid") base = base.filter((o) => o.payment_status !== "paid");
    const m = { all: base.length };
    for (const k of Object.keys(STATUS_LABELS)) m[k] = 0;
    for (const o of base) { const k = o.status || "pending"; m[k] = (m[k] || 0) + 1; }
    return m;
  }, [orders, range, pickDay, pay, todayStr, monthStr, last7]);

  const fRev = paidSum(filtered);
  const rangeLabel = range === "day" && pickDay ? pickDay
    : range === "today" ? "Өнөөдөр" : range === "7d" ? "Сүүлийн 7 хоног"
    : range === "month" ? "Энэ сар" : "Бүх цаг үе";

  const imgOf = (it) => {
    const prod = it.productId ? products[it.productId] : null;
    const imgs = prod?.images;
    if (Array.isArray(imgs) && imgs.length) return typeof imgs[0] === "string" ? imgs[0] : imgs[0]?.url;
    return null;
  };

  const StatCard = ({ title, n, rev }) => (
    <div className="card p-5">
      <p className="text-xs text-ink-400">{title}</p>
      <p className="mt-1 font-display text-2xl font-700">{n} <span className="text-sm font-500 text-ink-400">захиалга</span></p>
      <p className="mt-1 font-display font-600 text-beak-600">{formatPrice(rev)}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-700">🌐 Онлайн захиалга</h2>
        <p className="text-sm text-ink-400 mt-1">Захиалгыг дарж ямар бараа авсныг хараарай. Төлөв болон төлбөрийг өөрчилж болно.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard title="📅 Өнөөдөр" n={stat.today.n} rev={stat.today.rev} />
        <StatCard title="🗓 Сүүлийн 7 хоног" n={stat.week.n} rev={stat.week.rev} />
        <StatCard title="📆 Энэ сар" n={stat.month.n} rev={stat.month.rev} />
      </div>

      {/* Шүүлтүүр */}
      <div className="card p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { v: "today", l: "Өнөөдөр" }, { v: "7d", l: "7 хоног" },
            { v: "month", l: "Энэ сар" }, { v: "all", l: "Бүгд" },
          ].map((r) => (
            <button key={r.v} onClick={() => { setRange(r.v); setPickDay(""); }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${range === r.v ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"}`}>{r.l}</button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm text-ink-400">Өдөр:</label>
            <input type="date" value={pickDay}
              onChange={(e) => { setPickDay(e.target.value); setRange(e.target.value ? "day" : "today"); }}
              className="rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm" />
          </div>
        </div>
        {/* Төлбөрийн шүүлт */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { v: "all", l: "Бүх төлбөр" },
            { v: "paid", l: "✓ Төлсөн" },
            { v: "unpaid", l: "⏳ Төлөөгүй" },
          ].map((r) => (
            <button key={r.v} onClick={() => setPay(r.v)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${pay === r.v ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"}`}>{r.l}</button>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-semibold">{rangeLabel}:</span>
            <span>{filtered.length} захиалга</span>
            <span className="text-green-600 font-semibold">💰 {formatPrice(fRev)}</span>
          </div>
        </div>
        {/* Төлвөөр шүүх */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-ink/5 pt-3">
          <button onClick={() => setStatusF("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${statusF === "all" ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"}`}>
            Бүх төлөв <span className={statusF === "all" ? "text-cream/70" : "text-ink-400"}>{statusCounts.all}</span>
          </button>
          {Object.entries(STATUS_LABELS).map(([k, l]) => (
            <button key={k} onClick={() => setStatusF(k)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${statusF === k ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"}`}>
              {l} <span className={statusF === k ? "text-cream/70" : "text-ink-400"}>{statusCounts[k] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Жагсаалт */}
      {loading ? (
        <p className="text-ink-400">Ачаалж байна...</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((o) => {
            const open = openId === o.order_code;
            const itemCount = (o.items || []).reduce((s, it) => s + num(it.qty), 0);
            return (
              <div key={o.order_code} className="card overflow-hidden">
                {/* Толгой мөр — дарж дэлгэрэнгүй */}
                <button onClick={() => setOpenId(open ? null : o.order_code)}
                  className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 p-3 text-left text-sm hover:bg-cream/40">
                  <span className="font-mono font-bold">#{o.order_code}</span>
                  <span className="font-medium">{o.customer_name}</span>
                  <span className="text-ink-400">{o.phone}</span>
                  <span className="text-xs text-ink-400">🛍 {itemCount} ш · ⏱ {timeAgo(o.created_at)}</span>
                  <span className="ml-auto font-display font-600">{formatPrice(o.total)}</span>
                  <span className={`chip text-xs ${o.payment_status === "paid" ? "border-green-500 text-green-700" : "border-beak text-beak-600"}`}>
                    {o.payment_status === "paid" ? "✓ Төлсөн" : "⏳ Төлөөгүй"}
                  </span>
                  <span className="text-ink-400">{open ? "▲" : "▼"}</span>
                </button>

                {open && (
                  <div className="border-t border-ink/10 p-3 space-y-3 bg-paper">
                    {/* Бараанууд */}
                    <div className="space-y-1.5">
                      {(o.items || []).map((it, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          {imgOf(it) && <img src={imgOf(it)} alt="" className="h-10 w-10 rounded-lg object-cover bg-cream" />}
                          <span className="flex-1 truncate">{it.name}</span>
                          <span className="text-xs text-ink-400">{[it.size, it.color].filter(Boolean).join(" / ")} × {it.qty}</span>
                          <span className="font-display font-600">{formatPrice(num(it.unitPrice) * num(it.qty))}</span>
                        </div>
                      ))}
                      {(!o.items || o.items.length === 0) && <p className="text-xs text-ink-400">Барааны мэдээлэл алга.</p>}
                    </div>

                    <p className="text-sm text-ink-400 whitespace-pre-line">📍 {o.address}</p>
                    {o.note && <p className="text-xs text-beak-600">📝 {o.note}</p>}

                    {/* Төлөв + төлбөр */}
                    <div className="flex flex-wrap items-center gap-2 border-t border-ink/10 pt-3">
                      <label className="text-xs text-ink-400">Төлөв:</label>
                      <select value={o.status || "pending"} onChange={(e) => updateStatus(o.order_code, e.target.value)}
                        className="text-sm rounded-lg border border-ink/15 bg-paper px-2.5 py-1.5">
                        {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                      <button onClick={() => togglePaid(o.order_code, o.payment_status)}
                        className={`chip text-sm ${o.payment_status === "paid" ? "border-green-500 text-green-700" : "border-beak text-beak-600"}`}>
                        {o.payment_status === "paid" ? "✓ Төлсөн болгосон" : "⏳ Төлсөн болгох"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <p className="card p-6 text-center text-sm text-ink-400">Энэ хугацаанд захиалга алга.</p>}
        </div>
      )}
    </div>
  );
}
