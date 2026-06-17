"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function load() {
    const { data } = await supabase
      .from("profiles")
      .select("id,email,full_name,is_admin,is_cashier,created_at")
      .order("created_at", { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleCashier(user) {
    const next = !user.is_cashier;
    const { error } = await supabase
      .from("profiles")
      .update({ is_cashier: next })
      .eq("id", user.id);
    if (error) return alert(error.message);
    alert(next ? `✅ ${user.email} нь кассы боллоо!` : `❌ ${user.email}-ийн кассы эрхийг авлаа`);
    await load();
  }

  async function toggleAdmin(user) {
    const next = !user.is_admin;
    if (!confirm(next ? `${user.email}-г админ болгох уу?` : `${user.email}-ийн админ эрхийг авах уу?`)) return;
    const { error } = await supabase
      .from("profiles")
      .update({ is_admin: next })
      .eq("id", user.id);
    if (error) return alert(error.message);
    await load();
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
