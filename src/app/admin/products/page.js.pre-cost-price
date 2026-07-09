"use client";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, finalPrice, firstImageUrl, normalizeImages } from "@/lib/utils";

const COMMON_SIZES = {
  "Гутал": ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
  "Хувцас": ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
};
const COMMON_COLORS = ["Хар", "Цагаан", "Саарал", "Хүрэн", "Хөх", "Улаан", "Ногоон", "Шар", "Ягаан"];

const empty = {
  id: null, name: "", description: "", price: "", discount_percent: 0,
  category_id: "", brand_id: "", images: [],
  variants: [{ size: "", color: "", stock_branch1: "", stock_branch2: "" }],
  pair_price: "",
  gift_note: "",
};

export default function AdminProducts() {
  const supabase = createClient();
  const [cats, setCats] = useState([]);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sizeType, setSizeType] = useState("Хувцас");

  // Restock modal
  const [restockProduct, setRestockProduct] = useState(null);
  const [restockVariantIdx, setRestockVariantIdx] = useState(0);
  const [restockQty, setRestockQty] = useState("10");
  const [restockNote, setRestockNote] = useState("");
  const [restockBranch, setRestockBranch] = useState("branch1");
  const [restockBusy, setRestockBusy] = useState(false);

  async function load() {
    const [{ data: c }, { data: br }, { data: p }, { data: v }] = await Promise.all([
      supabase.from("categories").select("id,name").order("sort"),
      supabase.from("brands").select("id,name,logo_url").order("sort").order("name"),
      supabase.from("products").select("*, categories(name), brands(name,logo_url)").order("created_at", { ascending: false }),
      supabase.from("product_variants").select("product_id,size,color,stock_branch1,stock_branch2"),
    ]);
    setCats(c || []);
    setBrands(br || []);
    const variantsByProduct = {};
    for (const x of (v || [])) {
      if (!variantsByProduct[x.product_id]) variantsByProduct[x.product_id] = [];
      variantsByProduct[x.product_id].push(x);
    }
    const productsWithVariants = (p || []).map((pr) => ({
      ...pr,
      _variants: variantsByProduct[pr.id] || [],
      _stock1: (variantsByProduct[pr.id] || []).reduce((s, vv) => s + Number(vv.stock_branch1 || 0), 0),
      _stock2: (variantsByProduct[pr.id] || []).reduce((s, vv) => s + Number(vv.stock_branch2 || 0), 0),
      _totalStock: (variantsByProduct[pr.id] || []).reduce((s, vv) => s + Number(vv.stock_branch1 || 0) + Number(vv.stock_branch2 || 0), 0),
    }));
    setProducts(productsWithVariants);
  }
  useEffect(() => { load(); }, []);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  // Variants-ийг өнгөөр бүлэглэж, размераар эрэмбэлэх
  function sortVariants(variants) {
    // Sizing: тоо бол numeric, текст бол S/M/L/XL дараалал
    const SIZE_ORDER = { XS: 1, S: 2, M: 3, L: 4, XL: 5, "2XL": 6, "3XL": 7, "4XL": 8 };
    function sizeKey(s) {
      if (!s) return 0;
      if (SIZE_ORDER[s.toUpperCase()]) return SIZE_ORDER[s.toUpperCase()];
      const n = parseFloat(s);
      return isNaN(n) ? 1000 : n;
    }
    return [...variants].sort((a, b) => {
      // 1. Өнгөөр (өнгөгүй нь сүүлд)
      const colorA = a.color || "ZZZ";
      const colorB = b.color || "ZZZ";
      if (colorA !== colorB) return colorA.localeCompare(colorB, "mn");
      // 2. Размераар
      return sizeKey(a.size) - sizeKey(b.size);
    });
  }

  const productColors = useMemo(
    () => [...new Set(form.variants.map((v) => v.color).filter(Boolean))],
    [form.variants]
  );

  // Ачаа орох → modal нээх
  function openRestock(product) {
    if (!product._variants?.length) {
      alert("Энэ бараанд variant байхгүй. Эхлээд 'Засах' дарна уу.");
      return;
    }
    setRestockProduct(product);
    setRestockVariantIdx(0);
    setRestockQty("10");
    setRestockNote("");
  }

  async function submitRestock() {
    if (!restockProduct) return;
    const variant = restockProduct._variants[restockVariantIdx];
    if (!variant) return alert("Variant сонгоогүй");
    const qty = Number(restockQty);
    if (isNaN(qty) || qty < 1) return alert("Зөв тоо оруулна уу");

    setRestockBusy(true);
    const res = await fetch("/api/restock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: restockProduct.id,
        productName: restockProduct.name,
        size: variant.size || null,
        color: variant.color || null,
        qty,
        note: restockNote || null,
        branch: restockBranch,
      }),
    });
    const data = await res.json();
    setRestockBusy(false);
    if (!res.ok) return alert(data.error || "Алдаа");
    alert(`✅ ${qty} ширхэг нэмэгдэж нийт ${data.newStock} болсон.`);
    setRestockProduct(null);
    await load();
  }

  function setVariant(i, k, v) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[i] = { ...variants[i], [k]: v };
      return { ...f, variants };
    });
  }
  const addVariant = () => setForm((f) => ({ ...f, variants: [...f.variants, { size: "", color: "", stock_branch1: "", stock_branch2: "" }] }));
  const rmVariant = (i) => setForm((f) => ({ ...f, variants: f.variants.filter((_, x) => x !== i) }));
  const reorderVariants = () => setForm((f) => ({ ...f, variants: sortVariants(f.variants.filter(v => v.size || v.color)) }));

  function addSizeQuick(s) {
    const exists = form.variants.some((v) => v.size === s);
    if (exists) return;
    const hasEmpty = form.variants.length === 1 && !form.variants[0].size && !form.variants[0].color;
    if (hasEmpty) setVariant(0, "size", s);
    else setForm((f) => ({ ...f, variants: [...f.variants, { size: s, color: "", stock_branch1: "", stock_branch2: "" }] }));
  }

  async function uploadImgs(files) {
    const newImgs = [];
    for (const file of files) {
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
      const { error } = await supabase.storage.from("products").upload(path, file);
      if (error) { alert(error.message); continue; }
      const url = supabase.storage.from("products").getPublicUrl(path).data.publicUrl;
      newImgs.push({ url, color: null });
    }
    setForm((f) => ({ ...f, images: [...f.images, ...newImgs] }));
  }

  function setImageColor(i, color) {
    setForm((f) => {
      const images = [...f.images];
      images[i] = { ...images[i], color: color || null };
      return { ...f, images };
    });
  }

  function startNew() { setForm(empty); setOpen(true); }
  function startEdit(p) {
    setForm({
      id: p.id, name: p.name, description: p.description || "",
      price: p.price, discount_percent: p.discount_percent || 0,
      category_id: p.category_id || "",
      brand_id: p.brand_id || "",
      images: normalizeImages(p.images),
      variants: [{ size: "", color: "", stock_branch1: "", stock_branch2: "" }],
      pair_price: p.pair_price || "",
      gift_note: p.gift_note || "",
    });
    supabase.from("product_variants").select("size,color,stock_branch1,stock_branch2").eq("product_id", p.id).then(({ data }) => {
      if (data?.length) {
        const sorted = sortVariants(data);
        setForm((f) => ({ ...f, variants: sorted }));
      }
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name || !form.price) return alert("Нэр болон үнэ заавал.");
    setBusy(true);
    const payload = {
      name: form.name, description: form.description,
      price: Number(form.price), discount_percent: Number(form.discount_percent) || 0,
      category_id: form.category_id || null,
      brand_id: form.brand_id || null,
      images: form.images,
      pair_price: Number(form.pair_price) || null,
      gift_note: form.gift_note || null,
    };
    let productId = form.id;
    if (productId) {
      await supabase.from("products").update(payload).eq("id", productId);
      await supabase.from("product_variants").delete().eq("product_id", productId);
    } else {
      const { data } = await supabase.from("products").insert(payload).select("id").single();
      productId = data.id;
    }
    const variants = sortVariants(
      form.variants
        .filter((v) => v.size || v.color || v.stock_branch1 || v.stock_branch2)
    ).map((v) => {
      const s1 = Number(v.stock_branch1) || 0;
      const s2 = Number(v.stock_branch2) || 0;
      return {
        product_id: productId,
        size: v.size || null,
        color: v.color || null,
        stock_branch1: s1,
        stock_branch2: s2,
        stock: s1 + s2,
      };
    });
    if (variants.length) await supabase.from("product_variants").insert(variants);
    setOpen(false); setForm(empty);
    await load();
    setBusy(false);
  }

  async function remove(id) {
    if (!confirm("Барааг устгах уу?")) return;
    await supabase.from("products").delete().eq("id", id);
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-600">Бараа ({products.length})</h2>
        <button onClick={startNew} className="btn-accent">+ Шинэ бараа</button>
      </div>

      {open && (
        <div className="card space-y-6 p-4 sm:p-6">
          <h3 className="font-display text-lg font-600">{form.id ? "Бараа засах" : "Шинэ бараа нэмэх"}</h3>

          <div className="rounded-xl bg-cream/50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">1. Үндсэн мэдээлэл</p>
            <input className="input" placeholder="Барааны нэр (ж: Nike Vomero 5)" value={form.name} onChange={(e) => set("name", e.target.value)} />

            {/* АНГИЛАЛ + БРЭНД */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-ink-400 block mb-1">🗂 Ангилал</label>
                <select className="input" value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
                  <option value="">— Сонгох —</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-400 block mb-1">🏷 Брэнд</label>
                <select className="input" value={form.brand_id} onChange={(e) => set("brand_id", e.target.value)}>
                  <option value="">— Брэнд байхгүй —</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                {brands.length === 0 && (
                  <p className="text-xs text-beak-600 mt-1">💡 "🏷 Брэнд" хуудаснаас эхлээд нэмнэ үү</p>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input" type="number" placeholder="Үнэ (₮)" value={form.price} onChange={(e) => set("price", e.target.value)} />
              <input className="input" type="number" placeholder="Хямдрал (%)" value={form.discount_percent} onChange={(e) => set("discount_percent", e.target.value)} />
            </div>

            <textarea className="input min-h-20" placeholder="Тайлбар (заавал биш)" value={form.description} onChange={(e) => set("description", e.target.value)} />

            <div className="rounded-lg bg-paper border border-ink/10 p-3 space-y-2">
              <p className="text-sm font-semibold">🎁 2 ширхэг авбал багц үнэ (заавал биш)</p>
              <input
                className="input"
                type="number"
                placeholder="280000"
                value={form.pair_price}
                onChange={(e) => set("pair_price", e.target.value)}
              />
            </div>

            <input
              className="input"
              placeholder="🎁 Бэлгийн тэмдэглэгээ (заавал биш)"
              value={form.gift_note}
              onChange={(e) => set("gift_note", e.target.value)}
            />
          </div>

          <div className="rounded-xl bg-cream/50 p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">2. Хэмжээ · Өнгө · Үлдэгдэл</p>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-sm text-ink-400">Түргэн нэмэх:</span>
                {Object.keys(COMMON_SIZES).map((t) => (
                  <button key={t} onClick={() => setSizeType(t)}
                    className={`text-xs rounded-full px-3 py-1 border transition ${sizeType === t ? "border-ink bg-ink text-cream" : "border-ink/15"}`}>{t}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SIZES[sizeType].map((s) => {
                  const exists = form.variants.some((v) => v.size === s);
                  return (
                    <button key={s} onClick={() => addSizeQuick(s)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition ${exists ? "border-ink bg-ink text-cream" : "border-ink/15"}`}>{s}</button>
                  );
                })}
              </div>
            </div>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-[1fr_1fr_70px_70px_36px] gap-2 text-xs font-semibold text-ink-400 px-1 mb-1 min-w-[380px]">
                <span>Хэмжээ</span><span>Өнгө</span><span className="text-center">🏪 С1</span><span className="text-center">🏪 С2</span><span></span>
              </div>
              <div className="space-y-2 min-w-[380px]">
                {form.variants.map((v, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_70px_70px_36px] gap-2 items-start">
                    <input className="input !py-2.5 !rounded-lg" placeholder="40, M" value={v.size} onChange={(e) => setVariant(i, "size", e.target.value)} />
                    <input className="input !py-2.5 !rounded-lg" placeholder="Хар" value={v.color} onChange={(e) => setVariant(i, "color", e.target.value)} />
                    <input className="input !py-2.5 !rounded-lg text-center" type="number" placeholder="0" value={v.stock_branch1 || ""} onChange={(e) => setVariant(i, "stock_branch1", e.target.value)} />
                    <input className="input !py-2.5 !rounded-lg text-center" type="number" placeholder="0" value={v.stock_branch2 || ""} onChange={(e) => setVariant(i, "stock_branch2", e.target.value)} />
                    <button onClick={() => rmVariant(i)} className="grid h-10 w-9 place-items-center rounded-lg text-red-400 hover:bg-red-50">✕</button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <button onClick={addVariant} className="text-sm font-medium text-beak-600 hover:underline">+ мөр нэмэх</button>
                <button onClick={reorderVariants} className="text-sm font-medium text-ink-400 hover:text-ink hover:underline">↕ Өнгө/размераар эрэмбэлэх</button>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-cream/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-1">3. Зурагнууд</p>
            <div className="flex flex-wrap gap-3">
              {form.images.map((img, i) => (
                <div key={i} className="w-28">
                  <div className="relative group">
                    <img src={img.url} alt="" className="h-28 w-28 rounded-xl object-cover" />
                    <button
                      onClick={() => set("images", form.images.filter((_, x) => x !== i))}
                      className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-xs text-white opacity-0 group-hover:opacity-100"
                    >×</button>
                  </div>
                  <select
                    value={img.color || ""}
                    onChange={(e) => setImageColor(i, e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-ink/15 bg-paper px-2 py-1.5 text-xs outline-none focus:border-beak"
                  >
                    <option value="">Бүх өнгө</option>
                    {productColors.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
              <label className="grid h-28 w-28 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-ink/20 text-ink/30 hover:border-beak hover:text-beak transition">
                <div className="text-center">
                  <span className="text-2xl block">+</span>
                  <span className="text-xs">Зураг</span>
                </div>
                <input type="file" accept="image/*" multiple hidden onChange={(e) => uploadImgs([...e.target.files])} />
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={save} disabled={busy} className="btn-primary flex-1">{busy ? "Хадгалж..." : "💾 Хадгалах"}</button>
            <button onClick={() => { setOpen(false); setForm(empty); }} className="btn-ghost">Болих</button>
          </div>
        </div>
      )}

      <div className="card divide-y divide-ink/5 p-2">
        {products.map((p) => (
          <div key={p.id} className="p-3">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-cream">
                {firstImageUrl(p.images) && <img src={firstImageUrl(p.images)} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {p.brands?.logo_url && <img src={p.brands.logo_url} alt={p.brands?.name} className="h-4 w-4 object-contain" />}
                  {p.brands?.name && <span className="rounded-md bg-beak-100 text-beak-600 px-1.5 py-0.5 text-[10px] font-bold uppercase">{p.brands.name}</span>}
                  <p className="font-semibold truncate">{p.name}</p>
                </div>
                <p className="text-xs text-ink-400">
                  {p.categories?.name || "—"} · {formatPrice(finalPrice(p.price, p.discount_percent))}
                  {" · "}
                  <span className={`font-semibold ${p._totalStock === 0 ? "text-red-500" : p._totalStock < 5 ? "text-beak-600" : "text-green-600"}`}>
                    📦 {p._totalStock} ({p._stock1}+{p._stock2})
                  </span>
                </p>
              </div>
              <button
                onClick={() => openRestock(p)}
                className="rounded-full border border-green-500/30 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 transition"
              >
                📥 Ачаа
              </button>
              <button onClick={() => startEdit(p)} className="btn-ghost !py-2 !px-3 text-sm">Засах</button>
              <button onClick={() => remove(p.id)} className="text-sm text-red-500 hover:underline">Устгах</button>
            </div>
            {p._variants?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-[68px]">
                {p._variants.map((v, i) => {
                  const stock1 = Number(v.stock_branch1 || 0);
                  const stock2 = Number(v.stock_branch2 || 0);
                  const total = stock1 + stock2;
                  return (
                    <span key={i} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      total === 0 ? "bg-red-50 text-red-600 border border-red-200" :
                      total < 5 ? "bg-beak-100 text-beak-600 border border-beak/30" :
                      "bg-green-50 text-green-700 border border-green-200"
                    }`}>
                      {[v.size, v.color].filter(Boolean).join(" / ") || "—"}: <b>{stock1}</b> | <b>{stock2}</b>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {products.length === 0 && <p className="p-6 text-center text-sm text-ink-400">Бараа алга.</p>}
      </div>

      {/* ========= 📥 АЧАА ОРОХ MODAL ========= */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => !restockBusy && setRestockProduct(null)}>
          <div className="card w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-display font-700 text-lg">📥 Ачаа орох</p>
              <button onClick={() => setRestockProduct(null)} className="text-2xl text-ink-400">×</button>
            </div>
            <p className="text-sm font-semibold mb-3">{restockProduct.name}</p>

            {/* САЛБАР СОНГОХ */}
            <p className="text-xs font-semibold text-ink-400 mb-2">🏪 Аль салбарт ачаа орсон бэ?</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { v: "branch1", l: "🏪 Салбар 1" },
                { v: "branch2", l: "🏪 Салбар 2" },
              ].map((b) => (
                <button
                  key={b.v}
                  onClick={() => setRestockBranch(b.v)}
                  className={`rounded-lg border-2 px-3 py-2.5 text-sm font-bold transition ${
                    restockBranch === b.v
                      ? "bg-ink text-cream border-ink"
                      : "bg-paper border-ink/15 hover:border-ink/40"
                  }`}
                >
                  {b.l}
                </button>
              ))}
            </div>

            <p className="text-xs font-semibold text-ink-400 mb-2">Аль хэмжээ/өнгөнд ачаа орсон бэ?</p>
            <div className="space-y-1 max-h-72 overflow-y-auto mb-3 border border-ink/10 rounded-lg p-2 bg-cream/30">
              {restockProduct._variants.map((v, i) => {
                const label = [v.size, v.color].filter(Boolean).join(" / ") || "—";
                const isSelected = restockVariantIdx === i;
                const branchStock = restockBranch === "branch1" ? Number(v.stock_branch1 || 0) : Number(v.stock_branch2 || 0);
                return (
                  <button
                    key={i}
                    onClick={() => setRestockVariantIdx(i)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition ${
                      isSelected
                        ? "bg-ink text-cream font-bold"
                        : "hover:bg-paper border border-ink/5"
                    }`}
                  >
                    <span>{label}</span>
                    <span className={`text-xs ${isSelected ? "text-cream/70" : "text-ink-400"}`}>
                      📦 {restockBranch === "branch1" ? "С1" : "С2"}: {branchStock}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink-400 block mb-1">Хэдэн ширхэг нэмэх вэ?</label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-400 block mb-1">Тэмдэглэл (заавал биш)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Жишээ: Нийлүүлэгч А"
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={submitRestock} disabled={restockBusy} className="btn-primary flex-1">
                {restockBusy ? "Нэмж..." : `✓ ${restockBranch === "branch1" ? "Салбар 1" : "Салбар 2"}-д ачаа оруулах`}
              </button>
              <button onClick={() => setRestockProduct(null)} disabled={restockBusy} className="btn-ghost">Болих</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
