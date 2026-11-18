"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { firstImageUrl } from "@/lib/utils";

const emptyForm = { title: "", subtitle: "", link: "", image: "", sort: 0 };
const productIdFromLink = (link) => (link && link.startsWith("/product/") ? link.slice(9) : "");

// Зураг + нэртэй, хайлттай бараа сонгогч
function ProductPicker({ products, value, onChange }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const selected = products.find((p) => String(p.id) === String(value));

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = s ? products.filter((p) => p.name.toLowerCase().includes(s)) : products;
    return base.slice(0, 50);
  }, [products, q]);

  if (selected && !open) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-ink/15 bg-paper p-2">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream">
          {firstImageUrl(selected.images) && <img src={firstImageUrl(selected.images)} alt="" className="h-full w-full object-cover" />}
        </div>
        <span className="flex-1 min-w-0 truncate text-sm font-semibold">{selected.name}</span>
        <button onClick={() => setOpen(true)} className="text-xs rounded-lg border border-ink/15 px-2.5 py-1.5">Солих</button>
        <button onClick={() => onChange("")} className="text-xs text-red-500 hover:underline">Арилгах</button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ink/15 bg-paper p-2">
      <div className="flex gap-2">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Бараа хайх..."
          className="flex-1 rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm outline-none focus:border-beak" />
        {selected && <button onClick={() => setOpen(false)} className="text-xs rounded-lg border border-ink/15 px-2.5">Болих</button>}
      </div>
      <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
        <button onClick={() => { onChange(""); setOpen(false); }}
          className={`flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm hover:bg-cream ${!value ? "bg-cream" : ""}`}>
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-cream text-ink-400">🏬</span>
          <span className="text-ink-400">Бараа сонгоогүй (дэлгүүр рүү)</span>
        </button>
        {filtered.map((p) => (
          <button key={p.id} onClick={() => { onChange(p.id); setOpen(false); setQ(""); }}
            className={`flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-cream ${String(value) === String(p.id) ? "bg-beak-100" : ""}`}>
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-cream">
              {firstImageUrl(p.images) && <img src={firstImageUrl(p.images)} alt="" className="h-full w-full object-cover" />}
            </div>
            <span className="flex-1 min-w-0 truncate text-sm font-medium">{p.name}</span>
          </button>
        ))}
        {filtered.length === 0 && <p className="p-3 text-center text-xs text-ink-400">Олдсонгүй</p>}
      </div>
    </div>
  );
}

export default function AdminBanners() {
  const supabase = createClient();
  const [list, setList] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    const { data, error } = await supabase
      .from("hero_banners")
      .select("*")
      .order("sort", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) setErr("Хүснэгт олдсонгүй. SQL-ээ Supabase дээр ажиллуулсан эсэхээ шалгана уу.");
    else setErr("");
    setList(data || []);
  }
  async function loadProducts() {
    const { data } = await supabase.from("products").select("id,name,images").order("name").range(0, 4999);
    setProducts(data || []);
  }
  useEffect(() => { load(); loadProducts(); }, []);

  function resizeImage(file, maxW = 1920, quality = 0.85) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  async function uploadImg(file) {
    const blob = await resizeImage(file);
    const path = `banners/${Date.now()}-banner.jpg`;
    const { error } = await supabase.storage.from("products").upload(path, blob, { contentType: "image/jpeg" });
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
    setForm(emptyForm);
    await load();
  }
  async function update(b, patch) {
    await supabase.from("hero_banners").update(patch).eq("id", b.id);
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
        <h2 className="font-display text-xl font-700">🖼 Нүүрний баннер</h2>
        <p className="text-sm text-ink-400 mt-1">
          Нүүрний эхний том зураг. Хэд хэдэн баннер нэмбэл автоматаар солигдоно. Зураг дээр дарахад сонгосон бараа руу орно.
          <br />Зураг автоматаар жижигрэнэ. <b>Хэвтээ зураг</b> (ж: 2000×650) тохиромжтой.
        </p>
      </div>

      {err && <div className="card p-4 text-sm text-red-600 bg-red-50">{err}</div>}

      <div className="card p-5 space-y-4">
        <h3 className="font-display font-600">Шинэ баннер</h3>

        <div>
          <p className="text-sm font-semibold mb-2">Баннер зураг *</p>
          {form.image ? (
            <div className="relative inline-block w-full max-w-xl">
              <img src={form.image} alt="" className="aspect-[7/2] w-full rounded-xl object-cover" />
              <button onClick={() => setForm({ ...form, image: "" })}
                className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-xs text-white">×</button>
            </div>
          ) : (
            <label className="grid aspect-[7/2] w-full max-w-xl cursor-pointer place-items-center rounded-xl border-2 border-dashed border-ink/20 text-ink/30 hover:border-beak hover:text-beak transition">
              <div className="text-center"><span className="text-2xl block">+</span><span className="text-xs">Зураг сонгох</span></div>
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && uploadImg(e.target.files[0])} />
            </label>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold mb-2">Дарахад очих бараа</p>
          <ProductPicker products={products} value={productIdFromLink(form.link)}
            onChange={(pid) => setForm({ ...form, link: pid ? `/product/${pid}` : "" })} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" placeholder='Гарчиг (хоосон бол "Тавтай морил!")' value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="input" placeholder="Дэд бичиг (заавал биш)" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-ink-400">Дараалал</label>
          <input className="input !w-24" type="number" value={form.sort} onChange={(e) => setForm({ ...form, sort: e.target.value })} />
        </div>

        <button onClick={add} disabled={busy} className="btn-accent">{busy ? "Хадгалж байна..." : "Баннер нэмэх"}</button>
      </div>

      <div className="space-y-3">
        {list.map((b) => (
          <div key={b.id} className="card p-3 space-y-3">
            <div className="flex items-center gap-3">
              <img src={b.image} alt="" className="h-14 w-28 shrink-0 rounded-lg object-cover bg-cream" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{b.title || "Тавтай морил!"}</p>
                <p className="text-xs text-ink-400 truncate">{b.subtitle || "—"}</p>
              </div>
              <input type="number" defaultValue={b.sort ?? 0} onBlur={(e) => update(b, { sort: Number(e.target.value) || 0 })}
                className="w-14 rounded-lg border border-ink/15 bg-paper px-2 py-1.5 text-center text-sm" title="Дараалал" />
              <button onClick={() => update(b, { active: !b.active })} className={`chip ${b.active ? "border-green-500 text-green-700" : "border-ink/20 text-ink-400"}`}>
                {b.active ? "Идэвхтэй" : "Идэвхгүй"}
              </button>
              <button onClick={() => remove(b.id)} className="text-sm text-red-500 hover:underline">Устгах</button>
            </div>
            <div>
              <p className="text-xs text-ink-400 mb-1">Дарахад очих бараа:</p>
              <ProductPicker products={products} value={productIdFromLink(b.link)}
                onChange={(pid) => update(b, { link: pid ? `/product/${pid}` : null })} />
            </div>
          </div>
        ))}
        {list.length === 0 && !err && <p className="card p-4 text-sm text-ink-400">Баннер алга. Дээрээс нэмнэ үү.</p>}
      </div>
    </div>
  );
}
