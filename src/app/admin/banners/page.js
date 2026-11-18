"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminBanners() {
  const supabase = createClient();
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ title: "", subtitle: "", link: "", image: "", sort: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    const { data, error } = await supabase
      .from("hero_banners")
      .select("*")
      .order("sort", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) setErr("Хүснэгт олдсонгүй. SQL-ээ Supabase дээр ажиллуулсан эсэхээ шалгана уу.");
    setList(data || []);
  }
  useEffect(() => { load(); }, []);

  async function uploadImg(file) {
    const path = `banners/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("products").upload(path, file);
    if (error) return alert(error.message);
    const { data } = supabase.storage.from("products").getPublicUrl(path);
    setForm((f) => ({ ...f, image: data.publicUrl }));
  }

  async function add() {
    if (!form.image) return alert("Баннер зураг оруулна уу");
    setBusy(true);
    const { error } = await supabase.from("hero_banners").insert({
      title: form.title || null,
      subtitle: form.subtitle || null,
      link: form.link || null,
      image: form.image,
      sort: Number(form.sort) || 0,
      active: true,
    });
    setBusy(false);
    if (error) return alert("Алдаа: " + error.message);
    setForm({ title: "", subtitle: "", link: "", image: "", sort: 0 });
    await load();
  }
  async function toggle(b) {
    await supabase.from("hero_banners").update({ active: !b.active }).eq("id", b.id);
    await load();
  }
  async function setSort(b, v) {
    await supabase.from("hero_banners").update({ sort: Number(v) || 0 }).eq("id", b.id);
    await load();
  }
  async function remove(id) {
    if (!confirm("Устгах уу?")) return;
    await supabase.from("hero_banners").delete().eq("id", id);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-700">🖼 Нүүрний баннер (hero)</h2>
        <p className="text-sm text-ink-400 mt-1">
          Нүүрний эхний том зураг. Хэд хэдэн баннер нэмбэл автоматаар эргэлдэнэ (слайдер). Хэвтээ зураг (өргөн) тохиромжтой.
        </p>
      </div>

      {err && <div className="card p-4 text-sm text-red-600 bg-red-50">{err}</div>}

      <div className="card p-5 space-y-4">
        <h3 className="font-display font-600">Шинэ баннер</h3>

        {/* Зураг */}
        <div>
          <p className="text-sm font-semibold mb-2">Баннер зураг *</p>
          {form.image ? (
            <div className="relative inline-block">
              <img src={form.image} alt="" className="h-32 w-full max-w-md rounded-xl object-cover" />
              <button onClick={() => setForm({ ...form, image: "" })}
                className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-xs text-white">×</button>
            </div>
          ) : (
            <label className="grid h-32 w-full max-w-md cursor-pointer place-items-center rounded-xl border-2 border-dashed border-ink/20 text-ink/30 hover:border-beak hover:text-beak transition">
              <div className="text-center"><span className="text-2xl block">+</span><span className="text-xs">Зураг сонгох</span></div>
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && uploadImg(e.target.files[0])} />
            </label>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" placeholder="Гарчиг (заавал биш)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="input" placeholder="Дэд гарчиг (заавал биш)" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
          <input className="input" placeholder="Холбоос (ж: /category/sneakers — заавал биш)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          <input className="input" type="number" placeholder="Дараалал" value={form.sort} onChange={(e) => setForm({ ...form, sort: e.target.value })} />
        </div>
        <p className="text-xs text-ink-400">Гарчиг/дэд гарчиг оруулбал зураг дээр бичиг + "Дэлгүүр үзэх" товч гарч ирнэ. Хоосон бол зөвхөн зураг.</p>

        <button onClick={add} disabled={busy} className="btn-accent">{busy ? "Хадгалж байна..." : "Баннер нэмэх"}</button>
      </div>

      <div className="space-y-2">
        {list.map((b) => (
          <div key={b.id} className="card flex items-center gap-3 p-3">
            <img src={b.image} alt="" className="h-14 w-24 shrink-0 rounded-lg object-cover bg-cream" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{b.title || <span className="text-ink-400">(гарчиггүй)</span>}</p>
              <p className="text-xs text-ink-400 truncate">{b.subtitle || b.link || "—"}</p>
            </div>
            <input type="number" value={b.sort ?? 0} onChange={(e) => setSort(b, e.target.value)}
              className="w-14 rounded-lg border border-ink/15 bg-paper px-2 py-1.5 text-center text-sm" title="Дараалал" />
            <button onClick={() => toggle(b)} className={`chip ${b.active ? "border-green-500 text-green-700" : "border-ink/20 text-ink-400"}`}>
              {b.active ? "Идэвхтэй" : "Идэвхгүй"}
            </button>
            <button onClick={() => remove(b.id)} className="text-sm text-red-500 hover:underline">Устгах</button>
          </div>
        ))}
        {list.length === 0 && !err && <p className="card p-4 text-sm text-ink-400">Баннер алга. Дээрээс нэмнэ үү.</p>}
      </div>
    </div>
  );
}
