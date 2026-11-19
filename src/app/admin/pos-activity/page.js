"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";

const TZ = 8 * 3600000;
const localDay = (d) => new Date(new Date(d).getTime() + TZ).toISOString().slice(0, 10);
const localMonth = (d) => localDay(d).slice(0, 7);
const localTime = (d) => {
  const t = new Date(new Date(d).getTime() + TZ);
  return `${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`;
};

const ACTION = {
  sale: { l: "🛒 Зарсан", tone: "text-green-700" },
  manual_order: { l: "📝 Гар захиалга", tone: "text-green-700" },
  restock: { l: "📦 Ачаа нэмсэн", tone: "text-beak-600" },
  add_product: { l: "➕ Бараа нэмсэн", tone: "text-ink" },
  add_variant: { l: "➕ Размер нэмсэн", tone: "text-ink" },
};
const branchLabel = (b) => (b === "branch1" ? "Салбар 1" : b === "branch2" ? "Салбар 2" : b === "online" ? "Онлайн" : "—");

export default function PosActivity() {
  const supabase = createClient();
  const [rows, setRows] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [range, setRange] = useState("today");
  const [pickDay, setPickDay] = useState("");
  const [who, setWho] = useState("all");
  const [act, setAct] = useState("all"); // all | sale | restock | added

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("pos_activity").select("*").order("created_at", { ascending: false }).range(0, 100000);
      if (error) setErr("Хүснэгт олдсонгүй. pos_activity.sql-ээ Supabase дээр ажиллуулна уу.");
      setRows(data || []);
      try {
        const res = await fetch("/api/admin/users");
        const u = await res.json();
        if (res.ok) setCashiers((u.users || []).filter((x) => x.is_cashier).map((x) => x.full_name || x.email));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const now = Date.now();
  const todayStr = localDay(now);
  const monthStr = localMonth(now);
  const last7 = new Date(now - 7 * 86400000).toISOString();
  const num = (v) => Number(v || 0);

  const dateMatch = (d) =>
    range === "day" && pickDay ? localDay(d) === pickDay
    : range === "today" ? localDay(d) === todayStr
    : range === "7d" ? d >= last7
    : range === "month" ? localMonth(d) === monthStr
    : true;

  const dateRows = useMemo(() => rows.filter((r) => dateMatch(r.created_at)), [rows, range, pickDay, todayStr, monthStr, last7]);

  // Бүх кассчин (профайл + бүртгэлд гарсан нэрс)
  const staffNames = useMemo(() => {
    const set = new Set(cashiers);
    for (const r of rows) if (r.user_name) set.add(r.user_name);
    return [...set];
  }, [cashiers, rows]);

  const summaryOf = (name) => {
    const rs = dateRows.filter((r) => r.user_name === name);
    const saleAmt = rs.filter((r) => r.action === "sale").reduce((s, r) => s + num(r.amount), 0);
    const manualAmt = rs.filter((r) => r.action === "manual_order").reduce((s, r) => s + num(r.amount), 0);
    return {
      sales: rs.filter((r) => r.action === "sale").length,
      manual: rs.filter((r) => r.action === "manual_order").length,
      amt: saleAmt + manualAmt,
      restock: rs.filter((r) => r.action === "restock").length,
      added: rs.filter((r) => r.action === "add_product" || r.action === "add_variant").length,
    };
  };

  const matchAct = (r) =>
    act === "all" ? true : act === "added" ? (r.action === "add_product" || r.action === "add_variant") : r.action === act;

  const filtered = useMemo(
    () => dateRows.filter((r) => (who === "all" || r.user_name === who) && matchAct(r)),
    [dateRows, who, act]
  );

  // Сонгосон кассчны үйлдлийн тоо (chip-д)
  const whoRows = useMemo(() => (who === "all" ? [] : dateRows.filter((r) => r.user_name === who)), [dateRows, who]);
  const cnt = {
    all: whoRows.length,
    sale: whoRows.filter((r) => r.action === "sale").length,
    manual: whoRows.filter((r) => r.action === "manual_order").length,
    restock: whoRows.filter((r) => r.action === "restock").length,
    added: whoRows.filter((r) => r.action === "add_product" || r.action === "add_variant").length,
  };

  const periodLabel = range === "day" && pickDay ? pickDay : range === "today" ? "Өнөөдөр" : range === "7d" ? "7 хоног" : range === "month" ? "Энэ сар" : "Бүх цаг";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-700">🧾 POS үйлдлийн түүх</h2>
        <p className="text-sm text-ink-400 mt-1">Ажилтны нэр дээр дарж, тэр хүний {periodLabel.toLowerCase()} юу зарсан, ямар ачаа/бараа нэмснийг хараарай.</p>
      </div>

      {err && <div className="card p-4 text-sm text-red-600 bg-red-50">{err}</div>}

      {/* Огноо */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2">
          {[{ v: "today", l: "Өнөөдөр" }, { v: "7d", l: "7 хоног" }, { v: "month", l: "Энэ сар" }, { v: "all", l: "Бүгд" }].map((r) => (
            <button key={r.v} onClick={() => { setRange(r.v); setPickDay(""); }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${range === r.v ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"}`}>{r.l}</button>
          ))}
          <input type="date" value={pickDay} onChange={(e) => { setPickDay(e.target.value); setRange(e.target.value ? "day" : "today"); }}
            className="rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm" />
        </div>
      </div>

      {/* Кассчин картууд — дарж сонгоно */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <button onClick={() => { setWho("all"); setAct("all"); }}
          className={`card p-4 text-left transition ${who === "all" ? "ring-2 ring-ink" : "hover:shadow-card"}`}>
          <p className="font-display font-700">👥 Бүгд</p>
          <p className="mt-1 text-xs text-ink-400">{dateRows.length} үйлдэл</p>
        </button>
        {staffNames.map((name) => {
          const s = summaryOf(name);
          return (
            <button key={name} onClick={() => { setWho(name); setAct("all"); }}
              className={`card p-4 text-left transition ${who === name ? "ring-2 ring-ink" : "hover:shadow-card"}`}>
              <p className="font-display font-700 truncate">{name}</p>
              <p className="mt-1 text-sm"><span className="text-green-700 font-600">{formatPrice(s.amt)}</span></p>
              <p className="text-xs text-ink-400 mt-0.5">🛒 {s.sales} · 📝 {s.manual} · 📦 {s.restock} · ➕ {s.added}</p>
            </button>
          );
        })}
        {staffNames.length === 0 && !err && <p className="col-span-full text-sm text-ink-400 p-2">Ажилтан алга.</p>}
      </div>

      {/* Сонгосон кассчны үйлдлийн төрлүүд */}
      {who !== "all" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold mr-1">{who}:</span>
          {[
            { v: "all", l: `Бүгд (${cnt.all})` },
            { v: "sale", l: `🛒 Зарсан (${cnt.sale})` },
            { v: "manual_order", l: `📝 Гар захиалга (${cnt.manual})` },
            { v: "restock", l: `📦 Ачаа (${cnt.restock})` },
            { v: "added", l: `➕ Нэмсэн (${cnt.added})` },
          ].map((a) => (
            <button key={a.v} onClick={() => setAct(a.v)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${act === a.v ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"}`}>{a.l}</button>
          ))}
        </div>
      )}

      {/* Жагсаалт */}
      {loading ? <p className="text-ink-400">Ачаалж байна...</p> : (
        <div className="card divide-y divide-ink/5">
          {filtered.map((r) => {
            const a = ACTION[r.action] || { l: r.action, tone: "text-ink" };
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm">
                <span className="font-mono text-xs text-ink-400 w-28 shrink-0">{localDay(r.created_at)} {localTime(r.created_at)}</span>
                {who === "all" && <span className="font-semibold w-20 shrink-0 truncate">{r.user_name}</span>}
                <span className={`font-medium ${a.tone}`}>{a.l}</span>
                {r.branch && <span className="chip text-xs border-ink/15 text-ink-400">{branchLabel(r.branch)}</span>}
                <span className="flex-1 min-w-0 truncate text-ink-400">{r.detail}</span>
                {r.amount != null && <span className="font-display font-600">{formatPrice(r.amount)}</span>}
                {r.amount == null && r.qty != null && <span className="text-xs text-ink-400">{r.qty} ш</span>}
              </div>
            );
          })}
          {filtered.length === 0 && !err && <p className="p-6 text-center text-sm text-ink-400">Энэ хугацаанд үйлдэл алга.</p>}
        </div>
      )}
    </div>
  );
}
