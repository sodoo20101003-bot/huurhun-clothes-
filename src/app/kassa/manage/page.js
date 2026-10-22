"use client";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, finalPrice, firstImageUrl, normalizeImages } from "@/lib/utils";
import Link from "next/link";

const COMMON_SIZES = {
  "Гутал": ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
  "Хувцас": ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
};
const COMMON_COLORS = ["Хар", "Цагаан", "Саарал", "Хүрэн", "Хөх", "Улаан", "Ногоон", "Шар", "Ягаан"];

const emptyProduct = {
  name: "", price: "", discount_percent: 0, category_id: "", images: [],
  variants: [{ size: "", color: "", stock_branch1: "", stock_branch2: "" }],
};

function slugify(name) {
  const s = String(name || "").trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || `cat-${Date.now()}`;
}

export default function KassaManage() {
  const supabase = createClient();

  // === Нууц үгийн хаалт ===
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState("");
  useEffect(() => {
    try { if (sessionStorage.getItem("kassa_ok") === "1") setUnlocked(true); } catch {}
  }, []);
  function tryUnlock() {
    if (pw === "huurhun2026") {
      setUnlocked(true);
      try { sessionStorage.setItem("kassa_ok", "1"); } catch {}
    } else alert("Нууц үг буруу");
  }

  const [tab, setTab] = useState("list");
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Шинэ бараа
  const [form, setForm] = useState(emptyProduct);
  const [busy, setBusy] = useState(false);
  const [sizeType, setSizeType] = useState("Гутал");

  // Шинэ ангилал
  const [newCat, setNewCat] = useState("");
  const [catBusy, setCatBusy] = useState(false);

  // Ачаа
  const [restock, setRestock] = useState(null); // { product, variant }
  const [rBranch, setRBranch] = useState("branch1");
  const [rQty, setRQty] = useState("10");
  const [rBusy, setRBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: c }, { data: p }, { data: v }] = await Promise.all([
      supabase.from("categories").select("id,name,slug").order("name"),
      supabase.from("products").select("id,name,price,discount_percent,category_id,images, categories(name)").order("created_at", { ascending: false }),
      supabase.from("product_variants").select("id,product_id,size,color,stock_branch1,stock_branch2"),
    ]);
    setCats(c || []);
    const byProd = {};
    for (const x of (v || [])) {
      if (!byProd[x.product_id]) byProd[x.product_id] = [];
      byProd[x.product_id].push(x);
    }
    setProducts((p || []).map((pr) => ({
      ...pr,
      _variants: byProd[pr.id] || [],
      _s1: (byProd[pr.id] || []).reduce((s, vv) => s + Number(vv.stock_branch1 || 0), 0),
      _s2: (byProd[pr.id] || []).reduce((s, vv) => s + Number(vv.stock_branch2 || 0), 0),
    })));
    setLoading(false);
  }
  useEffect(() => { if (unlocked) load(); }, [unlocked]);

  function setV(i, k, val) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[i] = { ...variants[i], [k]: val };
      return { ...f, variants };
    });
  }
  const addRow = () => setForm((f) => ({ ...f, variants: [...f.variants, { size: "", color: "", stock_branch1: "", stock_branch2: "" }] }));
  const rmRow = (i) => setForm((f) => ({ ...f, variants: f.variants.filter((_, x) => x !== i) }));
  function quickSize(s) {
    if (form.variants.some((v) => v.size === s)) return;
    const empty = form.variants.length === 1 && !form.variants[0].size && !form.variants[0].color;
    if (empty) setV(0, "size", s);
    else setForm((f) => ({ ...f, variants: [...f.variants, { size: s, color: "", stock_branch1: "", stock_branch2: "" }] }));
  }

  async function uploadImgs(files) {
    const imgs = [];
    for (const file of files) {
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
      const { error } = await supabase.storage.from("products").upload(path, file);
      if (error) { alert(error.message); continue; }
      const url = supabase.storage.from("products").getPublicUrl(path).data.publicUrl;
      imgs.push({ url, color: null });
    }
    setForm((f) => ({ ...f, images: [...f.images, ...imgs] }));
  }

  async function saveProduct() {
    if (!form.name.trim() || !form.price) return alert("Нэр болон үнэ заавал");
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      discount_percent: Number(form.discount_percent) || 0,
      category_id: form.category_id || null,
      images: form.images,
      show_on_web: true,
    };
    const { data, error } = await supabase.from("products").insert(payload).select("id").single();
    if (error) { setBusy(false); return alert("Алдаа: " + error.message); }
    const variants = form.variants
      .filter((v) => v.size || v.color || v.stock_branch1 || v.stock_branch2)
      .map((v) => {
        const s1 = Number(v.stock_branch1) || 0;
        const s2 = Number(v.stock_branch2) || 0;
        return { product_id: data.id, size: v.size || null, color: v.color || null, stock_branch1: s1, stock_branch2: s2, stock: s1 + s2 };
      });
    if (variants.length) await supabase.from("product_variants").insert(variants);
    setBusy(false);
    setForm(emptyProduct);
    alert("✅ Бараа нэмэгдлээ");
    setTab("list");
    await load();
  }

  async function addCategory() {
    if (!newCat.trim()) return alert("Ангиллын нэр оруулна уу");
    setCatBusy(true);
    const { error } = await supabase.from("categories").insert({ name: newCat.trim(), slug: slugify(newCat) });
    setCatBusy(false);
    if (error) return alert("Алдаа: " + error.message);
    setNewCat("");
    alert("✅ Ангилал нэмэгдлээ");
    await load();
  }

  async function submitRestock() {
    if (!restock) return;
    const qty = Number(rQty);
    if (isNaN(qty) || qty < 1) return alert("Зөв тоо оруулна уу");
    setRBusy(true);
    const res = await fetch("/api/restock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: restock.product.id,
        productName: restock.product.name,
        size: restock.variant.size || null,
        color: restock.variant.color || null,
        qty,
        branch: rBranch,
      }),
    });
    const data = await res.json();
    setRBusy(false);
    if (!res.ok) return alert(data.error || "Алдаа");
    alert(`✅ ${qty} ширхэг нэмэгдлээ (${rBranch === "branch1" ? "Салбар 1" : "Салбар 2"})`);
    setRestock(null);
    await load();
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  // === НУУЦ ҮГ ===
  if (!unlocked) {
    return (
      <div className="min-h-[70vh] grid place-items-center p-4">
        <div className="card p-6 w-full max-w-xs text-center space-y-4">
          <p className="font-display text-xl font-700">🔒 Бараа удирдлага</p>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") tryUnlock(); }}
            placeholder="Нууц үг" autoFocus
            className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2.5 text-center outline-none focus:border-beak" />
          <button onClick={tryUnlock} className="btn-accent w-full">Орох</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-xl font-700">📦 Бараа удирдлага</h1>
        <Link href="/kassa" className="text-sm text-ink-400 hover:text-ink">← Касс руу</Link>
      </div>

      {/* TAB */}
      <div className="flex gap-2">
        {[
          { v: "list", l: "📋 Бүх бараа" },
          { v: "add", l: "➕ Шинэ бараа" },
          { v: "cats", l: "🗂 Ангилал" },
        ].map((t) => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === t.v ? "bg-ink text-cream" : "bg-cream border border-ink/15"}`}>{t.l}</button>
        ))}
      </div>

      {/* === БҮХ БАРАА === */}
      {tab === "list" && (
        <div className="space-y-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Бараа хайх..."
            className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2.5 outline-none focus:border-beak" />
          {loading ? <p className="text-ink-400 p-4 text-center">Ачаалж байна...</p> : (
            <div className="space-y-2">
              {filtered.map((p) => (
                <div key={p.id} className="card p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-cream">
                      {firstImageUrl(p.images) && <img src={firstImageUrl(p.images)} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{p.name}</p>
                      <p className="text-xs text-ink-400">
                        {p.categories?.name || "—"} · {formatPrice(finalPrice(p.price, p.discount_percent))}
                        {" · "}<span className="font-semibold text-green-700">С1 {p._s1}</span> · <span className="font-semibold text-beak-600">С2 {p._s2}</span>
                      </p>
                    </div>
                  </div>
                  {p._variants.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p._variants.map((v, i) => (
                        <button key={i}
                          onClick={() => { setRestock({ product: p, variant: v }); setRBranch("branch1"); setRQty("10"); }}
                          className="rounded-full border border-green-300 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 hover:bg-green-100">
                          📥 {[v.size, v.color].filter(Boolean).join(" / ") || "—"}: {v.stock_branch1 || 0}|{v.stock_branch2 || 0}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {filtered.length === 0 && <p className="text-center text-ink-400 p-6">Бараа алга</p>}
            </div>
          )}
        </div>
      )}

      {/* === ШИНЭ БАРАА === */}
      {tab === "add" && (
        <div className="card p-4 space-y-4">
          <input className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2.5 outline-none focus:border-beak"
            placeholder="Барааны нэр" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-3">
            <select className="rounded-lg border border-ink/15 bg-paper px-3 py-2.5 outline-none focus:border-beak"
              value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">— Ангилал —</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="number" className="rounded-lg border border-ink/15 bg-paper px-3 py-2.5 outline-none focus:border-beak"
              placeholder="Үнэ ₮" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <input type="number" className="rounded-lg border border-ink/15 bg-paper px-3 py-2.5 outline-none focus:border-beak"
              placeholder="Хямдрал %" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
          </div>

          {/* Хэмжээ/өнгө/С1/С2 */}
          <div className="rounded-xl bg-cream/50 p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-400">Түргэн:</span>
              {Object.keys(COMMON_SIZES).map((t) => (
                <button key={t} onClick={() => setSizeType(t)}
                  className={`text-xs rounded-full px-3 py-1 border ${sizeType === t ? "border-ink bg-ink text-cream" : "border-ink/15"}`}>{t}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_SIZES[sizeType].map((s) => (
                <button key={s} onClick={() => quickSize(s)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${form.variants.some((v) => v.size === s) ? "border-ink bg-ink text-cream" : "border-ink/15"}`}>{s}</button>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_1fr_60px_60px_32px] gap-2 text-xs font-semibold text-ink-400">
              <span>Хэмжээ</span><span>Өнгө</span><span className="text-center">С1</span><span className="text-center">С2</span><span></span>
            </div>
            {form.variants.map((v, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_60px_60px_32px] gap-2">
                <input className="rounded-lg border border-ink/15 bg-paper px-2 py-2 text-sm" placeholder="40" value={v.size} onChange={(e) => setV(i, "size", e.target.value)} />
                <input className="rounded-lg border border-ink/15 bg-paper px-2 py-2 text-sm" placeholder="Хар" value={v.color} onChange={(e) => setV(i, "color", e.target.value)} list="mn-colors" />
                <input type="number" className="rounded-lg border border-ink/15 bg-paper px-1 py-2 text-sm text-center" placeholder="0" value={v.stock_branch1} onChange={(e) => setV(i, "stock_branch1", e.target.value)} />
                <input type="number" className="rounded-lg border border-ink/15 bg-paper px-1 py-2 text-sm text-center" placeholder="0" value={v.stock_branch2} onChange={(e) => setV(i, "stock_branch2", e.target.value)} />
                <button onClick={() => rmRow(i)} className="text-red-400 hover:bg-red-50 rounded-lg">✕</button>
              </div>
            ))}
            <datalist id="mn-colors">{COMMON_COLORS.map((c) => <option key={c} value={c} />)}</datalist>
            <button onClick={addRow} className="text-sm font-medium text-beak-600 hover:underline">+ мөр нэмэх</button>
          </div>

          {/* Зураг */}
          <div className="flex flex-wrap gap-3">
            {form.images.map((img, i) => (
              <div key={i} className="relative">
                <img src={img.url} alt="" className="h-24 w-24 rounded-xl object-cover" />
                <button onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, x) => x !== i) }))}
                  className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-xs text-white">×</button>
              </div>
            ))}
            <label className="grid h-24 w-24 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-ink/20 text-ink/30 hover:border-beak">
              <span className="text-center text-xs">+ Зураг</span>
              <input type="file" accept="image/*" multiple hidden onChange={(e) => uploadImgs([...e.target.files])} />
            </label>
          </div>

          <button onClick={saveProduct} disabled={busy} className="btn-accent w-full">{busy ? "Хадгалж..." : "💾 Бараа нэмэх"}</button>
        </div>
      )}

      {/* === АНГИЛАЛ === */}
      {tab === "cats" && (
        <div className="space-y-4">
          <div className="card p-4 flex gap-2">
            <input className="flex-1 rounded-lg border border-ink/15 bg-paper px-3 py-2.5 outline-none focus:border-beak"
              placeholder="Шинэ ангиллын нэр" value={newCat} onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addCategory(); }} />
            <button onClick={addCategory} disabled={catBusy} className="btn-accent shrink-0">{catBusy ? "..." : "➕ Нэмэх"}</button>
          </div>
          <div className="card p-4">
            <p className="text-sm font-semibold mb-2">Одоогийн ангилал ({cats.length})</p>
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => (
                <span key={c.id} className="rounded-full bg-cream border border-ink/10 px-3 py-1.5 text-sm">{c.name}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === АЧАА MODAL === */}
      {restock && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => !rBusy && setRestock(null)}>
          <div className="card w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <p className="font-display font-700 text-lg">📥 Ачаа нэмэх</p>
            <p className="text-sm">{restock.product.name} — {[restock.variant.size, restock.variant.color].filter(Boolean).join(" / ") || "—"}</p>
            <p className="text-xs text-ink-400">С1: {restock.variant.stock_branch1 || 0} · С2: {restock.variant.stock_branch2 || 0}</p>
            <div className="grid grid-cols-2 gap-2">
              {[{ v: "branch1", l: "🏪 Салбар 1" }, { v: "branch2", l: "🏪 Салбар 2" }].map((b) => (
                <button key={b.v} onClick={() => setRBranch(b.v)}
                  className={`rounded-lg border-2 px-3 py-2.5 text-sm font-bold ${rBranch === b.v ? "bg-ink text-cream border-ink" : "bg-paper border-ink/15"}`}>{b.l}</button>
              ))}
            </div>
            <input type="number" min="1" value={rQty} onChange={(e) => setRQty(e.target.value)} autoFocus
              className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2.5 outline-none focus:border-beak" placeholder="Тоо" />
            <div className="flex gap-2">
              <button onClick={submitRestock} disabled={rBusy} className="btn-accent flex-1">{rBusy ? "Нэмж..." : "✓ Нэмэх"}</button>
              <button onClick={() => setRestock(null)} disabled={rBusy} className="btn-ghost">Болих</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
