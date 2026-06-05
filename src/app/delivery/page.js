"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, timeAgo } from "@/lib/utils";

// Хүргэлтийн ажилтны хуудас
// Нэвтрэх: hvrgelt@gmail.com / huurhun2026 (browser-д хадгалагдана)
const DELIVERY_EMAIL = "hvrgelt@gmail.com";
const DELIVERY_PASS = "huurhun2026";
const STORAGE_KEY = "delivery_logged_in";

export default function DeliveryPage() {
  const supabase = createClient();
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [orders, setOrders] = useState([]);
  const [code, setCode] = useState("");
  const [confirmMsg, setConfirmMsg] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "yes") {
      setLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (loggedIn) loadOrders();
  }, [loggedIn]);

  function login() {
    setErr("");
    if (email.trim() === DELIVERY_EMAIL && pass === DELIVERY_PASS) {
      localStorage.setItem(STORAGE_KEY, "yes");
      setLoggedIn(true);
    } else {
      setErr("Имэйл эсвэл нууц үг буруу байна.");
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setLoggedIn(false);
    setEmail("");
    setPass("");
  }

  async function loadOrders() {
    try {
      const res = await fetch("/api/delivery/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerPass: "huurhun2026" }),
      });
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e) {
      console.error("Delivery load error:", e);
      setOrders([]);
    }
  }

  async function confirmDelivery() {
    setConfirmMsg("");
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setConfirmMsg("6 оронтой кодыг зөв оруулна уу.");
      return;
    }
    try {
      const res = await fetch("/api/delivery/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, workerPass: "huurhun2026" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConfirmMsg(`❌ ${data.error || "Алдаа гарлаа"}`);
        return;
      }
      if (data.alreadyShipped) {
        setConfirmMsg(`✅ #${data.orderCode} аль хэдийн хүргэгдсэн байна.`);
      } else {
        setConfirmMsg(
          `✅ #${data.orderCode} хүргэгдсэн!${data.emailSent ? " 📧 Имэйл илгээгдлээ." : ""}`
        );
      }
      setCode("");
      await loadOrders();
    } catch (e) {
      setConfirmMsg("❌ Сүлжээний алдаа");
    }
  }

  if (!loggedIn) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="card p-8">
          <h1 className="font-display text-2xl font-700">Хүргэлтийн ажилтан</h1>
          <p className="mt-1 text-sm text-ink-400">Нэвтрэх</p>
          <div className="mt-6 space-y-3">
            <input
              type="email"
              className="input"
              placeholder="Имэйл"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              className="input"
              placeholder="Нууц үг"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
            />
            <button onClick={login} className="btn-primary w-full">Нэвтрэх</button>
            {err && <p className="text-sm text-red-600">{err}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-700">🚚 Хүргэлт</h1>
        <button onClick={logout} className="btn-ghost !py-2 text-sm">Гарах</button>
      </div>

      {/* Кодоор хүргэлт баталгаажуулах */}
      <div className="card p-5 mb-6">
        <h2 className="font-display font-600">Хүргэлт баталгаажуулах</h2>
        <p className="text-sm text-ink-400 mt-1">
          Захиалагчаас 6 оронтой кодыг асууж аваад энд оруулна
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            className="input flex-1 font-mono text-center text-lg tracking-widest"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && confirmDelivery()}
            maxLength={6}
            inputMode="numeric"
          />
          <button onClick={confirmDelivery} className="btn-accent">Баталгаажуулах</button>
        </div>
        {confirmMsg && (
          <p className={`mt-3 text-sm font-medium ${confirmMsg.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
            {confirmMsg}
          </p>
        )}
      </div>

      {/* Огноо сонгох */}
      {(() => {
        // Огнуудыг бүлэглэх
        const byDate = {};
        for (const o of orders) {
          const d = new Date(o.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          if (!byDate[key]) byDate[key] = [];
          byDate[key].push(o);
        }
        const dates = Object.keys(byDate).sort().reverse();
        const filtered = selectedDate ? (byDate[selectedDate] || []) : orders;
        return (
          <>
            {dates.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedDate(null)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                    selectedDate === null
                      ? "bg-ink text-cream border-ink"
                      : "bg-cream border-ink/10 hover:border-beak"
                  }`}
                >
                  Бүгд ({orders.length})
                </button>
                {dates.map((d) => {
                  const [y, m, day] = d.split("-");
                  const label = `${Number(m)}.${Number(day)}`;
                  return (
                    <button
                      key={d}
                      onClick={() => setSelectedDate(d)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                        selectedDate === d
                          ? "bg-beak text-ink border-beak"
                          : "bg-cream border-ink/10 hover:border-beak"
                      }`}
                    >
                      {label} ({byDate[d].length})
                    </button>
                  );
                })}
              </div>
            )}

            <h2 className="font-display text-lg font-600 mb-3">
              {selectedDate
                ? `${selectedDate.split("-")[1]}.${selectedDate.split("-")[2]} өдрийн захиалгууд (${filtered.length})`
                : `Хүргэх захиалгууд (${filtered.length})`}
            </h2>

            <div className="space-y-3">
              {filtered.map((o, idx) => {
                const isShipped = o.status === "shipped";
                return (
                  <div key={o.id} className={`card p-4 ${isShipped ? "opacity-60" : ""}`}>
                    <div className="flex items-start gap-3">
                      {/* Дугаар */}
                      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display font-700 text-sm ${
                        isShipped ? "bg-green-100 text-green-700" : "bg-beak text-ink"
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">📍 {o.address}</p>
                        <p className="mt-1 text-sm">
                          📞 <a href={`tel:+976${o.phone}`} className="text-beak-600 font-semibold">{o.phone}</a>
                        </p>
                        {/* Бараа жагсаалт */}
                        {o.items?.length > 0 && (
                          <div className="mt-2 text-sm text-ink-400 space-y-0.5">
                            {o.items.map((it, i) => (
                              <p key={i}>
                                👕 {it.name} ×{it.qty}
                                {it.size ? ` · ${it.size}` : ""}
                                {it.color ? ` · ${it.color}` : ""}
                              </p>
                            ))}
                          </div>
                        )}
                        {o.note && (
                          <p className="mt-2 text-sm text-ink-400">
                            💬 {o.note.split(/(https?:\/\/\S+)/g).map((part, i) =>
                              /^https?:\/\//.test(part) ? (
                                <a key={i} href={part} target="_blank" rel="noreferrer" className="text-beak-600 font-semibold underline">
                                  🗺 Газрын зураг нээх
                                </a>
                              ) : (
                                <span key={i}>{part}</span>
                              )
                            )}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-ink-400">
                          ⏱ {timeAgo(o.created_at)} · {new Date(o.created_at).toLocaleString("mn-MN")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-display font-600">{formatPrice(o.total)}</p>
                        {isShipped ? (
                          <span className="chip border-green-500 text-green-700 text-xs">✓ Хүргэгдсэн</span>
                        ) : (
                          <span className="chip border-beak text-beak-600 text-xs">Хүргэх</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <p className="card p-6 text-center text-sm text-ink-400">Захиалга алга.</p>}
            </div>
          </>
        );
      })()}
    </div>
  );
}
