"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [nf, setNf] = useState({ name: "", email: "", password: "" });
  const [nfBusy, setNfBusy] = useState(false);

  async function createStaff() {
    if (!nf.email || !nf.password) return alert("Имэйл болон нууц үг оруулна уу");
    setNfBusy(true);
    try {
      const res = await fetch("/api/admin/create-staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nf),
      });
      const data = await res.json();
      if (!res.ok) { setNfBusy(false); return alert("Алдаа: " + (data.error || "")); }
      alert(`✅ ${nf.name || nf.email} кассчин аккаунт үүслээ`);
      setNf({ name: "", email: "", password: "" });
      await load();
    } catch (e) { alert(e.message); }
    setNfBusy(false);
  }

  async function load() {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Алдаа");
      setUsers(data.users || []);
    } catch (e) {
      alert("Хэрэглэгч ачаалахад алдаа: " + e.message);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function setRole(user, field, value) {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, field, value }),
    });
    const data = await res.json();
    if (!res.ok) return alert("Алдаа: " + (data.error || ""));
    await load();
  }

  async function toggleCashier(user) {
    const next = !user.is_cashier;
    await setRole(user, "is_cashier", next);
  }

  async function toggleAdmin(user) {
    const next = !user.is_admin;
    if (!confirm(next ? `${user.email}-г админ болгох уу?` : `${user.email}-ийн админ эрхийг авах уу?`)) return;
    await setRole(user, "is_admin", next);
  }

  if (loading) return <p className="text-ink-400">Ачаалж байна...</p>;

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (u.email || "").toLowerCase().includes(q) || (u.full_name || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-700">👥 Хэрэглэгчид ({users.length})</h2>
      </div>

      {/* Шинэ кассчин үүсгэх */}
      <div className="card p-4 space-y-3 border border-beak/30">
        <h3 className="font-display font-600">💼 Шинэ кассчин нэмэх</h3>
        <p className="text-xs text-ink-400">Ажилтанд өөрийн имэйл + нууц үгээр касс руу нэвтрэх эрх үүсгэнэ. Нэг нууц үгийг хэд хэдэн хүнд өгч болно.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input className="input" placeholder="Нэр (ж: Gegee)" value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} />
          <input className="input" type="email" placeholder="Имэйл (gmail)" value={nf.email} onChange={(e) => setNf({ ...nf, email: e.target.value })} />
          <input className="input" placeholder="Нууц үг" value={nf.password} onChange={(e) => setNf({ ...nf, password: e.target.value })} />
        </div>
        <button onClick={createStaff} disabled={nfBusy} className="btn-accent">{nfBusy ? "Үүсгэж байна..." : "Кассчин үүсгэх"}</button>
      </div>

      <div className="card p-4">
        <input
          type="text"
          placeholder="🔍 Имэйл, нэрээр хайх..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input mb-3"
        />
        <p className="text-xs text-ink-400 mb-3">
          💡 Касс ажилтан болгохын тулд эхлээд тэр хүн нэвтэрсэн байх ёстой (өөрийн gmail-ээр бүртгүүлсэн байна).
          Дараа нь энд "💼 Касс" товч дарж эрх олгоно.
        </p>
        <div className="divide-y divide-ink/5">
          {filtered.map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{u.full_name || "—"}</p>
                <p className="text-xs text-ink-400 truncate">{u.email}</p>
              </div>
              {u.is_admin && (
                <span className="chip border-red-300 text-red-600 text-xs">⚡ Админ</span>
              )}
              {u.is_cashier && (
                <span className="chip border-beak text-beak-600 text-xs">💼 Касс</span>
              )}
              <button
                onClick={() => toggleCashier(u)}
                className={`text-xs rounded-full px-3 py-1.5 font-semibold transition ${
                  u.is_cashier
                    ? "bg-beak-100 text-beak-600 hover:bg-beak-200"
                    : "border border-ink/15 hover:bg-cream"
                }`}
              >
                {u.is_cashier ? "Кассын эрх авах" : "💼 Касс болгох"}
              </button>
              <button
                onClick={() => toggleAdmin(u)}
                className="text-xs text-red-500 hover:underline"
              >
                {u.is_admin ? "Админ эрх авах" : "Админ болгох"}
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="py-4 text-center text-sm text-ink-400">Хэрэглэгч олдсонгүй</p>
          )}
        </div>
      </div>
    </div>
  );
}
