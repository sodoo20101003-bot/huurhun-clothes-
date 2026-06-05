"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, ORDER_STATUS, timeAgo } from "@/lib/utils";

export default function AdminOrders() {
  const supabase = createClient();
  const [orders, setOrders] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [msgDraft, setMsgDraft] = useState({});

  async function load() {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders(data || []);
  }
  useEffect(() => { load(); }, []);

  // Захиалга устгахын тулд нууц үг шаардана. Дараах нууц үгээр л устгана.
  const DELETE_PASSWORD = "huurhun2026";

  async function deleteOrder(id, code) {
    const pass = prompt(`Захиалга #${code}-г устгахын тулд нууц үгээ оруулна уу:`);
    if (pass === null) return; // болих
    if (pass !== DELETE_PASSWORD) {
      alert("Нууц үг буруу байна!");
      return;
    }
    if (!confirm("Та энэ захиалгыг бүрмөсөн устгахдаа итгэлтэй байна уу?")) return;
    await supabase.from("orders").delete().eq("id", id);
    await load();
  }

  async function setStatus(id, status) {
    await supabase.from("orders").update({ status }).eq("id", id);
    await load();
  }
  async function setPaid(id, paid) {
    await supabase.from("orders").update({ payment_status: paid ? "paid" : "pending" }).eq("id", id);
    await load();
  }
  async function saveMessage(id) {
    const msg = msgDraft[id] ?? "";
    await supabase.from("orders").update({ status_message: msg || null }).eq("id", id);
    await load();
    alert("Мессеж хадгалагдлаа ✓");
  }

  const shown = orders.filter((o) =>
    filter === "all" ? true : filter === "paid" ? o.payment_status === "paid" : o.payment_status === "pending"
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-600">Захиалга ({orders.length})</h2>
        <div className="flex gap-2">
          {[["all", "Бүгд"], ["pending", "Хүлээгдэж буй"], ["paid", "Төлсөн"]].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={`chip ${filter === k ? "border-ink bg-ink text-cream" : "border-ink/15"}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {shown.map((o) => (
          <div key={o.id} className="card p-4">
            <button onClick={() => {
              setOpenId(openId === o.id ? null : o.id);
              if (!msgDraft[o.id] && o.status_message) {
                setMsgDraft((d) => ({ ...d, [o.id]: o.status_message }));
              }
            }} className="flex w-full items-center gap-3 text-left">
              <span className="font-mono font-semibold tracking-wider">#{o.order_code}</span>
              <span className="text-sm text-ink-400">{o.customer_name}</span>
              <span className="text-xs text-ink-400">⏱ {timeAgo(o.created_at)}</span>
              <span className="ml-auto font-display font-600">{formatPrice(o.total)}</span>
              <span className={`chip ${o.payment_status === "paid" ? "border-green-500 text-green-700" : "border-beak text-beak-600"}`}>
                {o.payment_status === "paid" ? "Төлсөн" : "Хүлээгдэж буй"}
              </span>
            </button>

            {openId === o.id && (
              <div className="mt-4 space-y-4 border-t border-ink/10 pt-4 text-sm">
                {/* Хэрэглэгчийн мэдээлэл */}
                <div className="grid gap-1 sm:grid-cols-2">
                  <p><span className="text-ink-400">Захиалгын код:</span> <b className="font-mono">{o.order_code}</b></p>
                  <p><span className="text-ink-400">Утас:</span> <a href={`tel:+976${o.phone}`} className="text-beak-600 font-semibold">{o.phone}</a></p>
                  <p className="sm:col-span-2"><span className="text-ink-400">Хаяг:</span> {o.address}</p>
                  {o.note && <p className="sm:col-span-2"><span className="text-ink-400">Тэмдэглэл:</span> {o.note}</p>}
                  <p><span className="text-ink-400">Огноо:</span> {new Date(o.created_at).toLocaleString("mn-MN")} <span className="text-xs text-beak-600">({timeAgo(o.created_at)})</span></p>
                </div>

                {/* Бараанууд */}
                <div>
                  <p className="mb-2 font-semibold">Бараанууд</p>
                  <div className="space-y-2">
                    {o.items?.map((it, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg bg-cream/50 p-2">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-cream">
                          {it.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full grid place-items-center text-xs text-ink/30">—</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{it.name}</p>
                          <p className="text-xs text-ink-400">
                            ×{it.qty}
                            {it.size ? ` · ${it.size}` : ""}
                            {it.color ? ` · ${it.color}` : ""}
                          </p>
                        </div>
                        <span className="font-display font-600">{formatPrice(it.unitPrice * it.qty)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Төлөв + Төлбөр + Устгах */}
                <div className="flex flex-wrap items-center gap-2">
                  <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className="input !w-auto !py-2">
                    {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button onClick={() => setPaid(o.id, o.payment_status !== "paid")} className="btn-ghost !py-2">
                    {o.payment_status === "paid" ? "Төлбөрийг буцаах" : "Төлсөн гэж тэмдэглэх"}
                  </button>
                  <button
                    onClick={() => deleteOrder(o.id, o.order_code)}
                    className="ml-auto rounded-full border-2 border-red-500/30 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition"
                  >
                    🗑 Устгах
                  </button>
                </div>

                {/* ===== ТУСГАЙ МЕССЕЖ (шинэ!) ===== */}
                <div className="rounded-xl bg-cream/50 p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                    💬 Хэрэглэгчид илгээх мессеж
                  </p>
                  <p className="text-xs text-ink-400">
                    Энэ мессеж хэрэглэгчийн захиалгын хуудас болон чат бот дээр харагдана.
                  </p>
                  <textarea
                    className="input min-h-16"
                    placeholder="Ж: Таны бараа хүргэлтэнд гарсан. 3-5 цагийн дотор хүрнэ."
                    value={msgDraft[o.id] ?? o.status_message ?? ""}
                    onChange={(e) => setMsgDraft((d) => ({ ...d, [o.id]: e.target.value }))}
                  />
                  <button onClick={() => saveMessage(o.id)} className="btn-accent !py-2 text-sm">
                    Мессеж хадгалах
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {shown.length === 0 && <p className="card p-6 text-center text-sm text-ink-400">Захиалга алга.</p>}
      </div>
    </div>
  );
}
