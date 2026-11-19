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
  restock: { l: "📦 Ачаа нэмсэн", tone: "text-beak-600" },
  add_product: { l: "➕ Бараа нэмсэн", tone: "text-ink" },
  add_variant: { l: "➕ Размер нэмсэн", tone: "text-ink" },
};
const branchLabel = (b) => (b === "branch1" ? "Салбар 1" : b === "branch2" ? "Салбар 2" : b === "online" ? "Онлайн" : "—");

export default function PosActivity() {
  const supabase = createClient();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [range, setRange] = useState("today");
  const [pickDay, setPickDay] = useState("");
  const [who, setWho] = useState("all");
  const [act, setAct] = useState("all");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("pos_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .range(0, 100000);
      if (error) setErr("Хүснэгт олдсонгүй. pos_activity.sql-ээ Supabase дээр ажиллуулна уу.");
      setRows(data || []);
      setLoading(false);
    })();
  }, []);

  const now = Date.now();
  const todayStr = localDay(now);
  const monthStr = localMonth(now);
  const last7 = new Date(now - 7 * 86400000).toISOString();

  const staff = useMemo(() => [...new Set(rows.map((r) => r.user_name).filter(Boolean))], [rows]);

  const filtered = useMemo(() => {
    let arr = rows;
    if (range === "day" && pickDay) arr = arr.filter((r) => localDay(r.created_at) === pickDay);
    else if (range === "today") arr = arr.filter((r) => localDay(r.created_at) === todayStr);
    else if (range === "7d") arr = arr.filter((r) => r.created_at >= last7);
    else if (range === "month") arr = arr.filter((r) => localMonth(r.created_at) === monthStr);
    if (who !== "all") arr = arr.filter((r) => r.user_name === who);
    if (act !== "all") arr = arr.filter((r) => r.action === act);
    return arr;
  }, [rows, range, pickDay, who, act, todayStr, monthStr, last7]);

  // Ажилтан бүрийн дүгнэлт (сонгосон хугацаанд)
  const perStaff = useMemo(() => {
    const m = {};
    for (const r of filtered) {
      const k = r.user_name || "—";
      if (!m[k]) m[k] = { sales: 0, saleAmt: 0, restock: 0, added: 0 };
      if (r.action === "sale") { m[k].sales += 1; m[k].saleAmt += Number(r.amount || 0); }
      else if (r.action === "restock") m[k].restock += 1;
      else m[k].added += 1;
    }
    return Object.entries(m).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.saleAmt - a.saleAmt);
  }, [filtered]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-700">🧾 POS үйлдлийн түүх</h2>
        <p className="text-sm text-ink-400 mt-1">Ажилтан бүр касс дээр юу зарсан, ямар ачаа/бараа нэмснийг цагтай нь харуулна.</p>
      </div>

      {err && <div className="card p-4 text-sm text-red-600 bg-red-50">{err}</div>}

      {/* Ажилтны дүгнэлт */}
      {perStaff.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {perStaff.map((s) => (
            <div key={s.name} className="card p-4">
              <p className="font-display font-700">{s.name}</p>
              <p className="mt-1 text-sm"><span className="text-green-700 font-600">{formatPrice(s.saleAmt)}</span> <span className="text-ink-400">· {s.sales} удаа зарсан</span></p>
              <p className="text-xs text-ink-400 mt-0.5">📦 {s.restock} ачаа · ➕ {s.added} бараа/размер</p>
            </div>
          ))}
        </div>
      )}

      {/* Шүүлтүүр */}
      <div className="card p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {[{ v: "today", l: "Өнөөдөр" }, { v: "7d", l: "7 хоног" }, { v: "month", l: "Энэ сар" }, { v: "all", l: "Бүгд" }].map((r) => (
            <button key={r.v} onClick={() => { setRange(r.v); setPickDay(""); }}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${range === r.v ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"}`}>{r.l}</button>
          ))}
          <input type="date" value={pickDay} onChange={(e) => { setPickDay(e.target.value); setRange(e.target.value ? "day" : "today"); }}
            className="rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={who} onChange={(e) => setWho(e.target.value)} className="rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm">
            <option value="all">Бүх ажилтан</option>
            {staff.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={act} onChange={(e) => setAct(e.target.value)} className="rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm">
            <option value="all">Бүх үйлдэл</option>
            {Object.entries(ACTION).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
          </select>
          <span className="ml-auto text-sm text-ink-400">{filtered.length} үйлдэл</span>
        </div>
      </div>

      {/* Жагсаалт */}
      {loading ? <p className="text-ink-400">Ачаалж байна...</p> : (
        <div className="card divide-y divide-ink/5">
          {filtered.map((r) => {
            const a = ACTION[r.action] || { l: r.action, tone: "text-ink" };
            return (
              <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm">
                <span className="font-mono text-xs text-ink-400 w-24 shrink-0">{localDay(r.created_at)} {localTime(r.created_at)}</span>
                <span className="font-semibold w-24 shrink-0 truncate">{r.user_name}</span>
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
