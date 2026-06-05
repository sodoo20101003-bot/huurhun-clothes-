"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";

function slugify(s) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\u0400-\u04FF\s-]/g, "")
    .replace(/\s+/g, "-");
}

export default function AdminCategories() {
  const supabase = createClient();
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({ name: "", image: "", pair_price: "" });
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", pair_price: "" });

  async function load() {
    const { data } = await supabase.from("categories").select("*").order("sort");
    setCats(data || []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!form.name) return;
    setBusy(true);
    await supabase.from("categories").insert({
      name: form.name,
      slug: slugify(form.name),
      image: form.image || null,
      pair_price: Number(form.pair_price) || null,
      sort: cats.length,
    });
    setForm({ name: "", image: "", pair_price: "" });
    await load();
    setBusy(false);
  }

  async function uploadImg(file) {
    const path = `categories/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("products").upload(path, file);
    if (error) return alert(error.message);
    const { data } = supabase.storage.from("products").getPublicUrl(path);
    setForm((f) => ({ ...f, image: data.publicUrl }));
  }

  async function remove(id) {
    if (!confirm("Энэ ангиллыг устгах уу?")) return;
    await supabase.from("categories").delete().eq("id", id);
    await load();
  }

  function startEdit(c) {
    setEditingId(c.id);
    setEditForm({ name: c.name, pair_price: c.pair_price || "" });
  }

  async function saveEdit(id) {
    await supabase.from("categories").update({
      name: editForm.name,
      slug: slugify(editForm.name),
      pair_price: Number(editForm.pair_price) || null,
    }).eq("id", id);
    setEditingId(null);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="font-display font-600">Шинэ ангилал</h2>
        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input className="input" placeholder="Ангиллын нэр (ж: Пүүз)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <label className="btn-ghost cursor-pointer">
              Зураг
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && uploadImg(e.target.files[0])} />
            </label>
          </div>

          {/* Ангиллын багц үнэ */}
          <div className="rounded-lg bg-cream/50 border border-ink/10 p-3 space-y-2">
            <p className="text-sm font-semibold">🎁 2 авбал багц үнэ (заавал биш)</p>
            <p className="text-xs text-ink-400">
              Жишээ нь "Пүүз" ангилалд 280000 гэж тавьвал хэрэглэгч <b>энэ ангиллын ямар ч 2 ширхэг</b> авбал
              нийтдээ 280,000₮-аар авна. 4 ширхэг = 560,000₮ г.м.
            </p>
            <input
              className="input"
              type="number"
              placeholder="2 ширхэгийн багц үнэ (₮) — ж: 280000"
              value={form.pair_price}
              onChange={(e) => setForm({ ...form, pair_price: e.target.value })}
            />
          </div>

          {form.image && <img src={form.image} alt="" className="h-20 w-28 rounded-xl object-cover" />}
          <button onClick={add} disabled={busy} className="btn-accent">{busy ? "Хадгалж байна..." : "Нэмэх"}</button>
        </div>
      </div>

      <div className="card divide-y divide-ink/5 p-2">
        {cats.map((c) => (
          <div key={c.id} className="p-3">
            {editingId === c.id ? (
              <div className="space-y-2">
                <input
                  className="input"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Нэр"
                />
                <input
                  className="input"
                  type="number"
                  value={editForm.pair_price}
                  onChange={(e) => setEditForm({ ...editForm, pair_price: e.target.value })}
                  placeholder="2 ширхэгийн багц үнэ (хоосон үлдээж болно)"
                />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(c.id)} className="btn-primary !py-2 text-sm">Хадгалах</button>
                  <button onClick={() => setEditingId(null)} className="btn-ghost !py-2 text-sm">Болих</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {c.image
                  ? <img src={c.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  : <div className="h-12 w-12 rounded-lg bg-cream dot-grid" />}
                <div className="flex-1">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-ink-400">
                    /{c.slug}
                    {c.pair_price && <span className="ml-2 text-beak-600 font-semibold">🎁 2 авбал = {formatPrice(c.pair_price)}</span>}
                  </p>
                </div>
                <button onClick={() => startEdit(c)} className="btn-ghost !py-2 !px-3 text-sm">Засах</button>
                <button onClick={() => remove(c.id)} className="text-sm text-red-500 hover:underline">Устгах</button>
              </div>
            )}
          </div>
        ))}
        {cats.length === 0 && <p className="p-4 text-sm text-ink-400">Ангилал алга.</p>}
      </div>
    </div>
  );
}
