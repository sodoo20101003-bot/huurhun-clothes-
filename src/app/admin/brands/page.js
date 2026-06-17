"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const empty = { id: null, name: "", logo_url: "", sort: 0 };

export default function AdminBrandsPage() {
  const supabase = createClient();
  const [brands, setBrands] = useState([]);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("brands")
      .select("*, products(count)")
      .order("sort")
      .order("name");
    setBrands(data || []);
  }
  useEffect(() => { load(); }, []);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function startNew() { setForm(empty); setOpen(true); }
  function startEdit(b) {
    setForm({ id: b.id, name: b.name, logo_url: b.logo_url || "", sort: b.sort || 0 });
    setOpen(true);
  }

  async function uploadLogo(file) {
    setUploading(true);
    const path = `brands/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("products").upload(path, file);
    if (error) {
      setUploading(false);
      return alert(error.message);
    }
    const url = supabase.storage.from("products").getPublicUrl(path).data.publicUrl;
    set("logo_url", url);
    setUploading(false);
  }

  async function save() {
    if (!form.name.trim()) return alert("Брэндийн нэр заавал!");
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      logo_url: form.logo_url || null,
      sort: Number(form.sort) || 0,
    };
    if (form.id) {
      await supabase.from("brands").update(payload).eq("id", form.id);
    } else {
      await supabase.from("brands").insert(payload);
    }
    setOpen(false);
    setForm(empty);
    await load();
    setBusy(false);
  }

  async function remove(b) {
    if (!confirm(`"${b.name}" брэндийг устгах уу?\n\nТэр брэндтэй бүх бараа "брэндгүй" болно.`)) return;
    await supabase.from("brands").delete().eq("id", b.id);
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-700">🏷 Брэнд ({brands.length})</h2>
        <button onClick={startNew} className="btn-accent">+ Шинэ брэнд</button>
      </div>

      {open && (
        <div className="card p-5 space-y-4">
          <h3 className="font-display text-lg font-600">{form.id ? "Брэнд засах" : "Шинэ брэнд нэмэх"}</h3>

          <div>
            <label className="text-xs font-semibold text-ink-400 block mb-1">Нэр *</label>
            <input
              className="input"
              placeholder="Жишээ: Nike"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-400 block mb-1">🖼 Logo</label>
            <div className="flex items-center gap-3">
              {form.logo_url ? (
                <div className="relative">
                  <img src={form.logo_url} alt="" className="h-20 w-20 rounded-xl bg-cream object-contain p-2 border border-ink/10" />
                  <button
                    onClick={() => set("logo_url", "")}
                    className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-xs text-white"
                  >×</button>
                </div>
              ) : (
                <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-ink/20 text-ink/30 hover:border-beak hover:text-beak transition">
                  <div className="text-center">
                    <span className="text-xl block">{uploading ? "..." : "+"}</span>
                    <span className="text-[10px]">{uploading ? "Татаж" : "Logo"}</span>
                  </div>
                  <input type="file" accept="image/*" hidden onChange={(e) => uploadLogo(e.target.files[0])} disabled={uploading} />
                </label>
              )}
              <div className="flex-1">
                <p className="text-xs text-ink-400">Logo нь дугуй эсвэл квадрат хэлбэрийн PNG (зөв нь透ardag) тохиромжтой.</p>
                <p className="text-xs text-ink-400 mt-1">Эсвэл logo URL шууд оруулж болно:</p>
                <input
                  className="input mt-1 !py-1.5 text-xs"
                  placeholder="https://..."
                  value={form.logo_url}
                  onChange={(e) => set("logo_url", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-400 block mb-1">Эрэмбэ (бага нь эхэнд)</label>
            <input
              type="number"
              className="input w-24"
              value={form.sort}
              onChange={(e) => set("sort", e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="btn-primary flex-1">
              {busy ? "Хадгалж..." : "💾 Хадгалах"}
            </button>
            <button onClick={() => { setOpen(false); setForm(empty); }} className="btn-ghost">Болих</button>
          </div>
        </div>
      )}

      <div className="card p-2 divide-y divide-ink/5">
        {brands.map((b) => (
          <div key={b.id} className="flex items-center gap-3 p-3">
            <div className="h-12 w-12 shrink-0 grid place-items-center rounded-lg bg-cream overflow-hidden">
              {b.logo_url ? (
                <img src={b.logo_url} alt={b.name} className="h-full w-full object-contain p-1" />
              ) : (
                <span className="text-xs text-ink-400">—</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-700">{b.name}</p>
              <p className="text-xs text-ink-400">
                Эрэмбэ: {b.sort || 0} · {b.products?.[0]?.count || 0} бараа
              </p>
            </div>
            <button onClick={() => startEdit(b)} className="btn-ghost !py-2 !px-3 text-sm">Засах</button>
            <button onClick={() => remove(b)} className="text-sm text-red-500 hover:underline">Устгах</button>
          </div>
        ))}
        {brands.length === 0 && (
          <p className="p-6 text-center text-sm text-ink-400">Брэнд алга. "+ Шинэ брэнд" дарж нэмнэ үү.</p>
        )}
      </div>
    </div>
  );
}
