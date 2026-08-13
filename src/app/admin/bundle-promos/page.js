"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

export default function BundlePromosPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState([]);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    category1_id: "",
    category2_id: "",
    bundle_price: "",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: cats }, { data: bp }] = await Promise.all([
      supabase.from("categories").select("id,name").order("name"),
      supabase.from("bundle_promos").select("*, cat1:category1_id(name), cat2:category2_id(name)").order("created_at", { ascending: false }),
    ]);
    setCategories(cats || []);
    setPromos(bp || []);
    setLoading(false);
  }

  function startEdit(p) {
    setEditing(p.id);
    setForm({
      name: p.name || "",
      category1_id: p.category1_id || "",
      category2_id: p.category2_id || "",
      bundle_price: p.bundle_price?.toString() || "",
      is_active: p.is_active !== false,
    });
    setMessage("");
  }

  function resetForm() {
    setEditing(null);
    setForm({ name: "", category1_id: "", category2_id: "", bundle_price: "", is_active: true });
    setMessage("");
  }

  async function save() {
    setMessage("");
    if (!form.name) return setMessage("❌ Урамшууллын нэрийг оруулна уу");
    if (!form.category1_id || !form.category2_id) return setMessage("❌ Ангилалуудыг сонгоно уу");
    if (form.category1_id === form.category2_id) return setMessage("❌ 2 өөр ангилал сонгоно уу");
    if (!form.bundle_price || Number(form.bundle_price) <= 0) return setMessage("❌ Багц үнэ оруулна уу");

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        category1_id: form.category1_id,
        category2_id: form.category2_id,
        bundle_price: Number(form.bundle_price),
        is_active: form.is_active,
      };

      let error;
      if (editing) {
        const { error: e } = await supabase.from("bundle_promos").update(payload).eq("id", editing);
        error = e;
      } else {
        const { error: e } = await supabase.from("bundle_promos").insert(payload);
        error = e;
      }

      if (error) throw error;

      setMessage(`✅ ${editing ? "Шинэчлэгдлээ" : "Нэмэгдлээ"}`);
      resetForm();
      await loadAll();
    } catch (e) {
      setMessage(`❌ Алдаа: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p) {
    await supabase.from("bundle_promos").update({ is_active: !p.is_active }).eq("id", p.id);
    await loadAll();
  }

  async function remove(id) {
    if (!confirm("Урамшууллыг устгах уу?")) return;
    await supabase.from("bundle_promos").delete().eq("id", id);
    await loadAll();
  }

  if (loading) return <p className="text-ink-400">Ачаалж байна...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-700">🎁 Багц урамшуулал</h1>
          <p className="text-sm text-ink-400 mt-1">2 ангилалын хосолсон багц үнэ тохируулах</p>
        </div>
        <Link href="/admin/promotions" className="text-sm text-ink-400 hover:text-ink">
          🎨 Banner урамшуулал →
        </Link>
      </div>

      {/* ФОРМ */}
      <div className="card p-5 space-y-4">
        <h2 className="font-display font-600 text-lg">
          {editing ? "✏️ Урамшуулал засах" : "➕ Шинэ багц урамшуулал"}
        </h2>

        <div>
          <label className="text-xs font-semibold text-ink-400 block mb-1">Урамшууллын нэр</label>
          <input
            className="input"
            placeholder="ж: Гутал + Цүнх багц"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-ink-400 block mb-1">Ангилал 1</label>
            <select
              className="input"
              value={form.category1_id}
              onChange={(e) => setForm({ ...form, category1_id: e.target.value })}
            >
              <option value="">— Сонгох —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-400 block mb-1">Ангилал 2</label>
            <select
              className="input"
              value={form.category2_id}
              onChange={(e) => setForm({ ...form, category2_id: e.target.value })}
            >
              <option value="">— Сонгох —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-ink-400 block mb-1">💰 Багц үнэ (₮)</label>
          <input
            className="input"
            type="number"
            placeholder="180000"
            value={form.bundle_price}
            onChange={(e) => setForm({ ...form, bundle_price: e.target.value })}
          />
          <p className="text-[10px] text-ink-400 mt-1">
            Хэрэглэгч 2 ангиллаас 1 бараа авбал → энэ үнэ автомат бодогдоно
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm font-semibold">✅ Идэвхтэй</span>
        </label>

        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {message}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="btn-accent flex-1"
          >
            {saving ? "Хадгалж..." : (editing ? "💾 Шинэчлэх" : "➕ Нэмэх")}
          </button>
          {editing && (
            <button onClick={resetForm} className="btn-ghost">Болих</button>
          )}
        </div>
      </div>

      {/* ЖАГСААЛТ */}
      <div className="card p-5">
        <h2 className="font-display font-600 text-lg mb-4">
          📋 Одоогийн урамшууллууд ({promos.length})
        </h2>
        <div className="space-y-2">
          {promos.length === 0 && (
            <p className="text-center text-ink-400 py-8">Урамшуулал алга байна</p>
          )}
          {promos.map((p) => (
            <div
              key={p.id}
              className={`p-4 rounded-xl border-2 flex items-center gap-3 ${
                p.is_active ? "border-beak/40 bg-beak-100/20" : "border-ink/10 bg-cream/30 opacity-60"
              }`}
            >
              <div className="text-3xl">🎁</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold">{p.name}</p>
                <p className="text-sm text-ink-400">
                  {p.cat1?.name || "?"} + {p.cat2?.name || "?"} ={" "}
                  <span className="font-bold text-beak-600">{formatPrice(p.bundle_price)}</span>
                </p>
              </div>
              <button
                onClick={() => toggleActive(p)}
                className={`text-xs px-3 py-1.5 rounded-full font-bold ${
                  p.is_active ? "bg-green-100 text-green-700" : "bg-ink/10 text-ink-400"
                }`}
              >
                {p.is_active ? "✅ Идэвхтэй" : "⏸ Идэвхгүй"}
              </button>
              <button onClick={() => startEdit(p)} className="btn-ghost !py-2 !px-3 text-sm">
                Засах
              </button>
              <button
                onClick={() => remove(p.id)}
                className="text-sm text-red-500 hover:underline"
              >
                Устгах
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-ink-400 p-3">
        💡 <b>Тайлбар:</b> Хэрэглэгч сагсанд 2 ангилалаас 1-1 бараа сонговол автомат багц үнэ бодогдоно.
        Жш: Гутал + Цүнх = 180,000₮. Cart-д харагдана.
      </div>
    </div>
  );
}
