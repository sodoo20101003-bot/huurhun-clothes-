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
  category_id: "", images: [], // [{url, color}]
  variants: [{ size: "", color: "", stock: "" }],
  pair_price: "",
  gift_note: "",
};

export default function AdminProducts() {
  const supabase = createClient();
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sizeType, setSizeType] = useState("Хувцас");

  async function load() {
    const [{ data: c }, { data: p }, { data: v }] = await Promise.all([
      supabase.from("categories").select("id,name").order("sort"),
      supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false }),
      supabase.from("product_variants").select("product_id,size,color,stock"),
    ]);
    setCats(c || []);
    // Бараа бүрд variant-уудыг хавсаргах
    const variantsByProduct = {};
    for (const x of (v || [])) {
      if (!variantsByProduct[x.product_id]) variantsByProduct[x.product_id] = [];
      variantsByProduct[x.product_id].push(x);
    }
    const productsWithVariants = (p || []).map((pr) => ({
      ...pr,
      _variants: variantsByProduct[pr.id] || [],
      _totalStock: (variantsByProduct[pr.id] || []).reduce((s, vv) => s + Number(vv.stock || 0), 0),
    }));
    setProducts(productsWithVariants);
  }
  useEffect(() => { load(); }, []);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  // Барааны өнгөнүүд (variant-аас гаргана) — зурагт оноох сонголтод хэрэглэнэ
  const productColors = useMemo(
    () => [...new Set(form.variants.map((v) => v.color).filter(Boolean))],
    [form.variants]
  );

  // Ачаа орох → бараа variant-ын үлдэгдэлд нэмэх
  async function restock(product) {
    if (!product._variants?.length) {
      alert("Энэ бараанд variant байхгүй байна. Эхлээд 'Засах' дарж размер/өнгөө нэмнэ үү.");
      return;
    }
    const choices = product._variants
      .map((v, i) => {
        const label = [v.size, v.color].filter(Boolean).join(" / ") || "—";
        return `${i + 1}. ${label} (одоо: ${v.stock} ширхэг)`;
      })
      .join("\n");
    const pickStr = prompt(`"${product.name}"\n\nАль хэмжээ/өнгөнд ачаа орсон бэ?\n\n${choices}\n\nДугаараа оруулна уу:`);
    if (!pickStr) return;
    const idx = Number(pickStr) - 1;
    if (isNaN(idx) || idx < 0 || idx >= product._variants.length) {
      alert("Буруу дугаар.");
      return;
    }
    const variant = product._variants[idx];
    const qtyStr = prompt(`Хэдэн ширхэг нэмэх вэ? (одоо ${variant.stock} ширхэг)`, "10");
    if (!qtyStr) return;
    const qty = Number(qtyStr);
    if (isNaN(qty) || qty < 1) {
      alert("Зөв тоо оруулна уу.");
      return;
    }
    const newStock = Number(variant.stock) + qty;
    let q = supabase.from("product_variants").update({ stock: newStock }).eq("product_id", product.id);
    if (variant.size) q = q.eq("size", variant.size); else q = q.is("size", null);
    if (variant.color) q = q.eq("color", variant.color); else q = q.is("color", null);
    const { error } = await q;
    if (error) { alert(error.message); return; }
    alert(`✅ ${product.name} (${[variant.size, variant.color].filter(Boolean).join("/")}) — ${qty} ширхэг нэмэгдэж нийт ${newStock} болсон.`);
    await load();
  }

  // Дэлгүүрт зарагдсан → үлдэгдлээс гар хасах
  async function shopSold(product) {
    if (!product._variants?.length) {
      alert("Энэ бараанд variant байхгүй байна.");
      return;
    }
    // Variant-уудыг сонгох мөн хэдэн ширхэг хасахаа асуух
    const choices = product._variants
      .map((v, i) => {
        const label = [v.size, v.color].filter(Boolean).join(" / ") || "—";
        return `${i + 1}. ${label} (одоо: ${v.stock} ширхэг)`;
      })
      .join("\n");
    const pickStr = prompt(`"${product.name}"\n\nАль хэмжээ/өнгө зарагдсан вэ?\n\n${choices}\n\nДугаараа оруулна уу:`);
    if (!pickStr) return;
    const idx = Number(pickStr) - 1;
    if (isNaN(idx) || idx < 0 || idx >= product._variants.length) {
      alert("Буруу дугаар.");
      return;
    }
    const variant = product._variants[idx];
    const qtyStr = prompt(`Хэдэн ширхэг зарагдсан бэ? (одоо ${variant.stock} ширхэг үлдсэн)`, "1");
    if (!qtyStr) return;
    const qty = Number(qtyStr);
    if (isNaN(qty) || qty < 1) {
      alert("Зөв тоо оруулна уу.");
      return;
    }
    if (qty > Number(variant.stock)) {
      alert(`Зөвхөн ${variant.stock} ширхэг үлдсэн байна!`);
      return;
    }
    // Төлбөрийн төрөл асуух
    const payStr = prompt(
      `Төлбөрийн төрөл?\n\n1 — Бэлэн мөнгө\n2 — Карт\n3 — Pocket\n4 — StorePay\n\nДугаараа оруулна уу:`,
      "1"
    );
    if (!payStr) return;
    const PAY_MAP = { "1": "cash", "2": "card", "3": "pocket", "4": "storepay" };
    const paymentMethod = PAY_MAP[payStr.trim()] || "cash";
    const PAY_LABEL = { cash: "Бэлэн", card: "Карт", pocket: "Pocket", storepay: "StorePay" };

    const res = await fetch("/api/shop-sale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        productName: product.name,
        size: variant.size || null,
        color: variant.color || null,
        qty,
        unitPrice: finalPrice(product.price, product.discount_percent),
        paymentMethod,
      }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Алдаа гарлаа"); return; }
    alert(`✅ ${product.name} — ${qty} ширхэг (${PAY_LABEL[paymentMethod]}) зарагдлаа!`);
    await load();
  }

  function setVariant(i, k, v) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[i] = { ...variants[i], [k]: v };
      return { ...f, variants };
    });
  }
  const addVariant = () => setForm((f) => ({ ...f, variants: [...f.variants, { size: "", color: "", stock: "" }] }));
  const rmVariant = (i) => setForm((f) => ({ ...f, variants: f.variants.filter((_, x) => x !== i) }));

  function addSizeQuick(s) {
    const exists = form.variants.some((v) => v.size === s);
    if (exists) return;
    const hasEmpty = form.variants.length === 1 && !form.variants[0].size && !form.variants[0].color;
    if (hasEmpty) setVariant(0, "size", s);
    else setForm((f) => ({ ...f, variants: [...f.variants, { size: s, color: "", stock: "" }] }));
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

  // Зурагт өнгө оноох
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
      category_id: p.category_id || "", images: normalizeImages(p.images),
      variants: [{ size: "", color: "", stock: "" }],
      pair_price: p.pair_price || "",
      gift_note: p.gift_note || "",
    });
    supabase.from("product_variants").select("size,color,stock").eq("product_id", p.id).then(({ data }) => {
      if (data?.length) setForm((f) => ({ ...f, variants: data }));
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
      images: form.images, // [{url, color}]
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
    const variants = form.variants
      .filter((v) => v.size || v.color || v.stock)
      .map((v) => ({ product_id: productId, size: v.size || null, color: v.color || null, stock: Number(v.stock) || 0 }));
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
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-600">Бараа ({products.length})</h2>
        <button onClick={startNew} className="btn-accent">+ Шинэ бараа</button>
      </div>

      {open && (
        <div className="card space-y-6 p-4 sm:p-6">
          <h3 className="font-display text-lg font-600">{form.id ? "Бараа засах" : "Шинэ бараа нэмэх"}</h3>

          {/* ҮНДСЭН МЭДЭЭЛЭЛ */}
          <div className="rounded-xl bg-cream/50 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">1. Үндсэн мэдээлэл</p>
            <input className="input" placeholder="Барааны нэр (ж: Air Jordan 1 Low)" value={form.name} onChange={(e) => set("name", e.target.value)} />
            <div className="grid gap-3 sm:grid-cols-3">
              <select className="input" value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
                <option value="">— Ангилал —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input className="input" type="number" placeholder="Үнэ (₮)" value={form.price} onChange={(e) => set("price", e.target.value)} />
              <input className="input" type="number" placeholder="Хямдрал (%)" value={form.discount_percent} onChange={(e) => set("discount_percent", e.target.value)} />
            </div>
            <textarea className="input min-h-20" placeholder="Тайлбар (заавал биш)" value={form.description} onChange={(e) => set("description", e.target.value)} />

            {/* 2 ширхэг авбал багц үнэ */}
            <div className="rounded-lg bg-paper border border-ink/10 p-3 space-y-2">
              <p className="text-sm font-semibold">🎁 2 ширхэг авбал багц үнэ (заавал биш)</p>
              <p className="text-xs text-ink-400">
                Жишээ: 1 ширхэг 190,000₮ → 2 ширхэг авбал 280,000₮.
                <br />
                3 ширхэг = 280,000 + 190,000. 4 ширхэг = 280,000 + 280,000.
                <br />
                <b>Хоосон үлдээвэл</b> энэ урамшуулал идэвхгүй.
              </p>
              <input
                className="input"
                type="number"
                placeholder="2 ширхэгийн багц үнэ (₮) — ж: 280000"
                value={form.pair_price}
                onChange={(e) => set("pair_price", e.target.value)}
              />
            </div>

            {/* Бэлгийн тэмдэглэгээ */}
            <input
              className="input"
              placeholder="🎁 Бэлгийн тэмдэглэгээ (ж: 'Энэ барааг авбал бэлэгтэй') — заавал биш"
              value={form.gift_note}
              onChange={(e) => set("gift_note", e.target.value)}
            />
          </div>

          {/* ХЭМЖЭЭ / ӨНГӨ / ҮЛДЭГДЭЛ — эхэлж энийг бөглөнө, дараа нь зурагт өнгө оноох боломжтой */}
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
                      className={`rounded-lg border px-3 py-1.5 text-sm transition ${exists ? "border-ink bg-ink text-cream" : "border-ink/15 hover:border-ink/40"}`}>{s}</button>
                  );
                })}
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="grid grid-cols-[1fr_1fr_90px_36px] gap-2 text-xs font-semibold text-ink-400 px-1 mb-1 min-w-[340px]">
                <span>Хэмжээ</span><span>Өнгө</span><span>Тоо</span><span></span>
              </div>
              <div className="space-y-2 min-w-[340px]">
                {form.variants.map((v, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_90px_36px] gap-2 items-start">
                    <input className="input !py-2.5 !rounded-lg" placeholder="40, M" value={v.size} onChange={(e) => setVariant(i, "size", e.target.value)} />
                    <div className="relative">
                      <input className="input !py-2.5 !rounded-lg" placeholder="Хар" value={v.color} onChange={(e) => setVariant(i, "color", e.target.value)} />
                      {!v.color && (
                        <div className="absolute left-0 top-full mt-1 z-10 flex flex-wrap gap-1 rounded-lg bg-paper p-2 shadow-soft border border-ink/10 w-[180px]">
                          {COMMON_COLORS.map((c) => (
                            <button key={c} onClick={() => setVariant(i, "color", c)} className="rounded-md border border-ink/10 px-2 py-1 text-xs hover:bg-cream transition">{c}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input className="input !py-2.5 !rounded-lg text-center" type="number" placeholder="0" value={v.stock} onChange={(e) => setVariant(i, "stock", e.target.value)} />
                    <button onClick={() => rmVariant(i)} className="grid h-10 w-9 place-items-center rounded-lg text-red-400 hover:bg-red-50 transition">✕</button>
                  </div>
                ))}
              </div>
              <button onClick={addVariant} className="mt-3 text-sm font-medium text-beak-600 hover:underline">+ мөр нэмэх</button>
            </div>
          </div>

          {/* ЗУРАГ — өнгө оноох */}
          <div className="rounded-xl bg-cream/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-1">3. Зурагнууд</p>
            <p className="text-xs text-ink-400 mb-3">
              Зураг бүрт <b>өнгө оноож</b> болно. Тухайн өнгийг сонгоход зөвхөн тэр өнгөний зураг харагдана.
              "Бүх өнгө" гэвэл хаана ч харагдана.
            </p>
            <div className="flex flex-wrap gap-3">
              {form.images.map((img, i) => (
                <div key={i} className="w-28">
                  <div className="relative group">
                    <img src={img.url} alt="" className="h-28 w-28 rounded-xl object-cover" />
                    <button
                      onClick={() => set("images", form.images.filter((_, x) => x !== i))}
                      className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-xs text-white opacity-0 group-hover:opacity-100 transition"
                    >×</button>
                  </div>
                  {/* Өнгө сонгох */}
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
            {productColors.length === 0 && (
              <p className="mt-2 text-xs text-beak-600">
                💡 Эхлээд дээр өнгө нэмбэл (2-р хэсэг), зураг бүрт өнгө оноох боломжтой болно.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={save} disabled={busy} className="btn-primary flex-1">{busy ? "Хадгалж байна..." : "💾 Хадгалах"}</button>
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
                <p className="font-semibold truncate">{p.name}</p>
                <p className="text-xs text-ink-400">
                  {p.categories?.name || "—"} · {formatPrice(finalPrice(p.price, p.discount_percent))}
                  {p.discount_percent > 0 && ` (-${p.discount_percent}%)`}
                  {" · "}
                  <span className={`font-semibold ${p._totalStock === 0 ? "text-red-500" : p._totalStock < 5 ? "text-beak-600" : "text-green-600"}`}>
                    📦 Нийт {p._totalStock} үлдсэн
                  </span>
                </p>
              </div>
              <button
                onClick={() => restock(p)}
                className="rounded-full border border-green-500/30 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 transition"
                title="Ачаа орох → үлдэгдэлд нэмэх"
              >
                📥 Ачаа
              </button>
              <button
                onClick={() => shopSold(p)}
                className="rounded-full border border-beak/30 bg-beak-100 px-3 py-2 text-xs font-semibold text-beak-600 hover:bg-beak/20 transition"
                title="Дэлгүүрт зарагдсан → үлдэгдлээс хасах"
              >
                🏪 Зарагдсан
              </button>
              <button onClick={() => startEdit(p)} className="btn-ghost !py-2 !px-3 text-sm">Засах</button>
              <button onClick={() => remove(p.id)} className="text-sm text-red-500 hover:underline">Устгах</button>
            </div>

            {/* Variant бүрийн үлдэгдэл — нарийн харагдац */}
            {p._variants?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-[68px]">
                {p._variants.map((v, i) => {
                  const label = [v.size, v.color].filter(Boolean).join(" / ") || "—";
                  const stock = Number(v.stock || 0);
                  return (
                    <span
                      key={i}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        stock === 0
                          ? "bg-red-50 text-red-600 border border-red-200"
                          : stock < 5
                          ? "bg-beak-100 text-beak-600 border border-beak/30"
                          : "bg-green-50 text-green-700 border border-green-200"
                      }`}
                    >
                      {label}: {stock}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {products.length === 0 && <p className="p-6 text-center text-sm text-ink-400">Бараа алга.</p>}
      </div>
    </div>
  );
}
