"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, timeAgo } from "@/lib/utils";
import Link from "next/link";

const STATUS_LABELS = {
  pending: "⏳ Хүлээгдэж буй",
  preparing: "📦 Бэлдэж байна",
  out_for_delivery: "🚛 Хүргэлтэд гарсан",
  shipped: "🚚 Хүргэгдсэн",
  cancelled: "❌ Цуцалсан",
};

export default function AdminOrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | paid | pending | shipped

  async function load() {
    const [{ data: o }, { data: p }] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id,name,images"),
    ]);
    const prodMap = {};
    for (const x of (p || [])) prodMap[x.id] = x;
    setProducts(prodMap);
    setOrders(o || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function updateStatus(orderCode, status) {
    await supabase.from("orders").update({ status }).eq("order_code", orderCode);
    await load();
  }
  async function togglePaid(orderCode, currentStatus) {
    const next = currentStatus === "paid" ? "pending" : "paid";
    await supabase.from("orders").update({ payment_status: next }).eq("order_code", orderCode);
    await load();
  }
  async function removeOrder(orderCode) {
    const password = prompt("Захиалгыг устгахын тулд нууц үг оруулна уу:");
    if (password !== "huurhun2026") return alert("Буруу нууц үг");
    await supabase.from("orders").delete().eq("order_code", orderCode);
    await load();
  }

  if (loading) return <p className="text-ink-400">Ачаалж байна...</p>;

  const filtered = orders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "paid") return o.payment_status === "paid";
    if (filter === "pending") return o.payment_status === "pending";
    if (filter === "shipped") return o.status === "shipped";
    if (filter === "out_for_delivery") return o.status === "out_for_delivery";
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display text-xl font-700">Захиалга ({orders.length})</h2>
        <Link href="/admin/orders/new" className="rounded-full bg-beak text-ink px-4 py-2 text-sm font-bold hover:bg-beak-600 hover:text-cream transition">
          📝 Гар захиалга нэмэх
        </Link>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[
          { v: "all", l: "Бүгд" },
          { v: "paid", l: "✓ Төлсөн" },
          { v: "pending", l: "⏳ Хүлээгдэж буй" },
          { v: "out_for_delivery", l: "🚛 Хүргэлтэд гарсан" },
          { v: "shipped", l: "🚚 Хүргэгдсэн" },
        ].map((f) => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              filter === f.v ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"
            }`}>{f.l}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((o) => (
          <div key={o.order_code} className="card p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono font-bold text-lg">#{o.order_code}</span>
              <span className="font-semibold">{o.customer_name}</span>
              <a href={`tel:${o.phone}`} className="text-sm text-ink-400 hover:text-beak-600">📞 {o.phone}</a>
              <span className="text-xs text-ink-400">⏱ {timeAgo(o.created_at)}</span>
              <span className="ml-auto font-display font-700 text-lg">{formatPrice(o.total)}</span>
            </div>

            <p className="text-sm text-ink-400 mt-2 whitespace-pre-line">📍 {o.address}</p>
            {o.note && <p className="text-xs text-beak-600 mt-1">📝 {o.note}</p>}

            <div className="mt-3 space-y-1 border-t border-ink/10 pt-2">
              {(o.items || []).map((it, i) => {
                const prod = it.productId ? products[it.productId] : null;
                const img = prod && Array.isArray(prod.images) && prod.images.length > 0
                  ? (typeof prod.images[0] === "string" ? prod.images[0] : prod.images[0]?.url)
                  : null;
                return (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {img && <img src={img} alt="" className="h-8 w-8 rounded object-cover" />}
                    <span className="flex-1 truncate">{it.name}</span>
                    <span className="text-xs text-ink-400">{[it.size, it.color].filter(Boolean).join(" / ")} × {it.qty}</span>
                    <span className="font-display font-600">{formatPrice(Number(it.unitPrice) * Number(it.qty))}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <select value={o.status || "pending"} onChange={(e) => updateStatus(o.order_code, e.target.value)}
                className="text-xs rounded-md border border-ink/15 bg-paper px-2 py-1.5">
                {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <button onClick={() => togglePaid(o.order_code, o.payment_status)}
                className={`chip text-xs ${o.payment_status === "paid" ? "border-green-500 text-green-700" : "border-beak text-beak-600"}`}>
                {o.payment_status === "paid" ? "✓ Төлсөн" : "⏳ Төлөөгүй"}
              </button>
              <button onClick={() => removeOrder(o.order_code)} className="ml-auto text-xs text-red-500 hover:underline">🗑 Устгах</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card p-10 text-center text-ink-400">Захиалга байхгүй байна</div>
        )}
      </div>
    </div>
  );
}
