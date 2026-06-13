"use client";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, finalPrice, firstImageUrl, normalizeImages } from "@/lib/utils";

const COMMON_SIZES = {
  "Гутал": ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
  "Хувцас": ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
};
const COMMON_COLORS = ["Хар", "Цагаан", "Саарал", "Хүрэн", "Хөх", "Улаан", "Ногоон", "Шар", "Ягаан"];

const PAY_OPTIONS = [
  { value: "cash", label: "💵 Бэлэн" },
  { value: "card", label: "💳 Карт" },
  { value: "pocket", label: "📱 Pocket" },
  { value: "storepay", label: "🛍 StorePay" },
  { value: "dans", label: "🏦 Данс" },
];

const BRANCH_OPTIONS = [
  { value: "branch1", label: "Салбар 1" },
  { value: "branch2", label: "Салбар 2" },
];

const empty = {
  id: null, name: "", description: "", price: "", discount_percent: 0,
  category_id: "", images: [],
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

  // 1+1 modal-ийн state
  const [pairModal, setPairModal] = useState(false);
  const [pairItems, setPairItems] = useState([null, null]); // [{product, variant, qty}, ...]
  const [pairPay, setPairPay] = useState("cash");
  const [pairBranch, setPairBranch] = useState("branch1");
  const [pairPrice, setPairPrice] = useState("");
  const [pairBusy, setPairBusy] = useState(false);

  async function load() {
    const [{ data: c }, { data: p }, { data: v }] = await Promise.all([
      supabase.from("categories").select("id,name,pair_price").order("sort"),
      supabase.from("products").select("*, categories(name,pair_price)").order("created_at", { ascending: false }),
      supabase.from("product_variants").select("product_id,size,color,stock"),
    ]);
    setCats(c || []);
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

  const productColors = useMemo(
    () => [...new Set(form.variants.map((v) => v.color).filter(Boolean))],
    [form.variants]
  );

  // === 1+1 хосолсон зарах: автомат үнэ бодолт ===
  // Хоёр бараа сонгогдсон үед автоматаар pair_price тоолно.
  function computePairPrice(items) {
    const [a, b] = items;
    if (!a?.product || !b?.product) return null;
    // 1) Ижил ангилалд категорийн pair_price байвал тэрийг ашиглана
    const catAId = a.product.category_id;
    const catBId = b.product.category_id;
    if (catAId && catBId && catAId === catBId) {
      const catPair = Number(a.product.categories?.pair_price);
      if (catPair > 0) return catPair;
    }
    // 2) Хэрэв product-ын өөрийн pair_price (хоёр ширхэгийн багц) байвал...
    //    Зөвхөн хоёр ижил бараа байх үед хэрэглэнэ
    if (a.product.id === b.product.id && Number(a.product.pair_price) > 0) {
      return Number(a.product.pair_price);
    }
    // 3) Багц байхгүй → энгийн нийлбэр
    const fa = finalPrice(a.product.price, a.product.discount_percent);
    const fb = finalPrice(b.product.price, b.product.discount_percent);
    return fa + fb;
  }

  // pairItems солигдох тоолох
  useEffect(() => {
    const p = computePairPrice(pairItems);
    if (p !== null) setPairPrice(String(p));
  }, [pairItems]);

  function openPairModal() {
    setPairItems([null, null]);
    setPairPrice("");
    setPairPay("cash");
    setPairBranch("branch1");
    setPairModal(true);
  }

  function pickPairProduct(slotIndex, product) {
    setPairItems((items) => {
      const next = [...items];
      next[slotIndex] = { product, variantIdx: 0, qty: 1 };
      return next;
    });
  }

  function updatePairSlot(slotIndex, patch) {
    setPairItems((items) => {
      const next = [...items];
      next[slotIndex] = { ...next[slotIndex], ...patch };
      return next;
    });
  }

  async function submitPairSale() {
    const [a, b] = pairItems;
    if (!a?.product || !b?.product) return alert("Хоёр барааг сонгоно уу");
    if (!a.product._variants?.length || !b.product._variants?.length) {
      return alert("Хоёр бараа хоёулаа хэмжээ/өнгөтэй байх ёстой");
    }
    const va = a.product._variants[a.variantIdx];
    const vb = b.product._variants[b.variantIdx];
    if (Number(a.qty) > Number(va.stock)) return alert(`${a.product.name}: зөвхөн ${va.stock} ширхэг үлдсэн`);
    if (Number(b.qty) > Number(vb.stock)) return alert(`${b.product.name}: зөвхөн ${vb.stock} ширхэг үлдсэн`);
    const total = Number(pairPrice);
    if (!total || total <= 0) return alert("Нийт үнэ буруу");

    setPairBusy(true);
    const res = await fetch("/api/shop-sale-pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          { productId: a.product.id, productName: a.product.name, size: va.size, color: va.color, qty: a.qty, unitPrice: finalPrice(a.product.price, a.product.discount_percent) },
          { productId: b.product.id, productName: b.product.name, size: vb.size, color: vb.color, qty: b.qty, unitPrice: finalPrice(b.product.price, b.product.discount_percent) },
        ],
        totalPrice: total,
        paymentMethod: pairPay,
        branch: pairBranch,
      }),
    });
    const data = await res.json();
    setPairBusy(false);
    if (!res.ok) return alert(data.error || "Алдаа гарлаа");
    alert(`✅ 1+1 хосолсон зарагдалт амжилттай! Нийт: ${formatPrice(total)}`);
    setPairModal(false);
    await load();
  }

  // === ҮЛДСЭН функцууд (restock, shopSold, etc) ===
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

  async function shopSold(product) {
    if (!product._variants?.length) {
      alert("Энэ бараанд variant байхгүй байна.");
      return;
    }
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
    const payStr = prompt(
      `Төлбөрийн төрөл?\n\n1 — Бэлэн мөнгө\n2 — Карт\n3 — Pocket\n4 — StorePay\n5 — Данс\n\nДугаараа оруулна уу:`,
      "1"
    );
    if (!payStr) return;
    const PAY_MAP = { "1": "cash", "2": "card", "3": "pocket", "4": "storepay", "5": "dans" };
    const paymentMethod = PAY_MAP[payStr.trim()] || "cash";
    const PAY_LABEL = { cash: "Бэлэн", card: "Карт", pocket: "Pocket", storepay: "StorePay", dans: "Данс" };

    // Аль салбараас зарагдсан?
    const branchStr = prompt(`Аль салбар?\n\n1 — Салбар 1\n2 — Салбар 2\n\nДугаараа оруулна уу:`, "1");
    if (!branchStr) return;
    const branch = branchStr.trim() === "2" ? "branch2" : "branch1";
    const BRANCH_LABEL = { branch1: "Салбар 1", branch2: "Салбар 2" };

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
        branch,
      }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Алдаа гарлаа"); return; }
    alert(`✅ ${product.name} — ${qty} ширхэг (${PAY_LABEL[paymentMethod]} · ${BRANCH_LABEL[branch]}) зарагдлаа!`);
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-600">Бараа ({products.length})</h2>
        <div className="flex gap-2">
          <button onClick={openPairModal} className="btn-ghost border border-beak/30 bg-beak-100 text-beak-600 font-semibold">
            🛍 1+1 зарах
          </button>
          <button onClick={startNew} className="btn-accent">+ Шинэ бараа</button>
        </div>
      </div>

      {/* ============ 1+1 MODAL ============ */}
      {pairModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setPairModal(false)}>
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-700">🛍 1+1 хосолсон зарагдалт</h3>
              <button onClick={() => setPairModal(false)} className="text-2xl text-ink-400 hover:text-ink">×</button>
            </div>

            {[0, 1].map((slot) => {
              const item = pairItems[slot];
              return (
                <div key={slot} className="rounded-xl bg-cream/50 p-3 mb-3">
                  <p className="text-xs font-semibold text-ink-400 mb-2">{slot + 1}-р БАРАА</p>
                  {!item?.product ? (
                    <div>
                      <p className="text-sm text-ink-400 mb-2">Бараа сонгох:</p>
                      <div className="max-h-44 overflow-y-auto space-y-1 rounded-lg border border-ink/10 bg-paper p-2">
                        {products.filter((p) => p._totalStock > 0).map((p) => (
                          <button
                            key={p.id}
                            onClick={() => pickPairProduct(slot, p)}
                            className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left text-sm hover:bg-cream transition"
                          >
                            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-cream">
                              {firstImageUrl(p.images) && <img src={firstImageUrl(p.images)} alt="" className="h-full w-full object-cover" />}
                            </div>
                            <span className="flex-1 truncate font-semibold">{p.name}</span>
                            <span className="text-xs text-ink-400">{formatPrice(finalPrice(p.price, p.discount_percent))}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream">
                        {firstImageUrl(item.product.images) && <img src={firstImageUrl(item.product.images)} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{item.product.name}</p>
                        <p className="text-xs text-ink-400">{formatPrice(finalPrice(item.product.price, item.product.discount_percent))}</p>
                      </div>
                      <select
                        className="input !py-1.5 !w-32 text-xs"
                        value={item.variantIdx}
                        onChange={(e) => updatePairSlot(slot, { variantIdx: Number(e.target.value) })}
                      >
                        {item.product._variants.map((v, i) => (
                          <option key={i} value={i}>
                            {[v.size, v.color].filter(Boolean).join("/") || "—"} ({v.stock})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => updatePairSlot(slot, null) || setPairItems((arr) => { const c = [...arr]; c[slot] = null; return c; })}
                        className="text-xs text-red-500 hover:underline"
                      >Солих</button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Үнэ + Төлбөр */}
            <div className="rounded-xl bg-cream/50 p-3 mb-3 space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink-400 block mb-1">💰 Нийт үнэ (автомат бодогдсон, гар хийсэн засаж болно)</label>
                <input
                  type="number"
                  className="input"
                  value={pairPrice}
                  onChange={(e) => setPairPrice(e.target.value)}
                  placeholder="280000"
                />
                {pairItems[0]?.product && pairItems[1]?.product && (
                  <p className="text-xs text-ink-400 mt-1">
                    Энгийн дүн:{" "}
                    {formatPrice(
                      finalPrice(pairItems[0].product.price, pairItems[0].product.discount_percent) +
                        finalPrice(pairItems[1].product.price, pairItems[1].product.discount_percent)
                    )}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-400 block mb-1.5">💳 Төлбөрийн төрөл</label>
                <div className="flex flex-wrap gap-2">
                  {PAY_OPTIONS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPairPay(p.value)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        pairPay === p.value
                          ? "bg-ink text-cream border-ink"
                          : "bg-paper border-ink/15 hover:border-beak"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-400 block mb-1.5">🏪 Салбар</label>
                <div className="flex flex-wrap gap-2">
                  {BRANCH_OPTIONS.map((b) => (
                    <button
                      key={b.value}
                      onClick={() => setPairBranch(b.value)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        pairBranch === b.value
                          ? "bg-ink text-cream border-ink"
                          : "bg-paper border-ink/15 hover:border-beak"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={submitPairSale} disabled={pairBusy || !pairItems[0]?.product || !pairItems[1]?.product} className="btn-primary flex-1">
                {pairBusy ? "Бүртгэж байна..." : "💾 Зарагдалт хадгалах"}
              </button>
              <button onClick={() => setPairModal(false)} className="btn-ghost">Болих</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ Засах форм ============ */}
      {open && (
        <div className="card space-y-6 p-4 sm:p-6">
          <h3 className="font-display text-lg font-600">{form.id ? "Бараа засах" : "Шинэ бараа нэмэх"}</h3>

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

            <input
              className="input"
              placeholder="🎁 Бэлгийн тэмдэглэгээ (ж: 'Энэ барааг авбал бэлэгтэй') — заавал биш"
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

          <div className="rounded-xl bg-cream/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-1">3. Зурагнууд</p>
            <p className="text-xs text-ink-400 mb-3">
              Зураг бүрт <b>өнгө оноож</b> болно.
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
            <button onClick={save} disabled={busy} className="btn-primary flex-1">{busy ? "Хадгалж байна..." : "💾 Хадгалах"}</button>
            <button onClick={() => { setOpen(false); setForm(empty); }} className="btn-ghost">Болих</button>
          </div>
        </div>
      )}

      {/* ============ Бараа жагсаалт ============ */}
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
