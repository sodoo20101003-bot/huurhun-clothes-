"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, finalPrice, firstImageUrl } from "@/lib/utils";

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

export default function KassaPage() {
  const supabase = createClient();
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [brands, setBrands] = useState([]);
  const [activeCat, setActiveCat] = useState("all");
  const [activeBrand, setActiveBrand] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [pickProduct, setPickProduct] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ name: "", price: "", qty: 1, categoryId: "" });
  const [manualBusy, setManualBusy] = useState(false);
  const [branch, setBranch] = useState("branch1");
  const [totalOverride, setTotalOverride] = useState("");
  const [busy, setBusy] = useState(false);
  const [payments, setPayments] = useState({});

  async function load() {
    const [{ data: c }, { data: br }, { data: p }, { data: v }] = await Promise.all([
      supabase.from("categories").select("id,name,pair_price").order("sort"),
      supabase.from("brands").select("id,name,logo_url").order("sort").order("name"),
      supabase.from("products").select("*, categories(name,pair_price), brands(id,name,logo_url)").order("created_at", { ascending: false }),
      supabase.from("product_variants").select("id,product_id,size,color,stock"),
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
      _totalStock: (variantsByProduct[pr.id] || []).reduce((s, vv) => s + Number(vv.stock || 0), 0),
    }));
    setProducts(productsWithVariants);
  }
  useEffect(() => { load(); }, []);

  // Тухайн ангилалд харьяалагдах брэндүүд (logo-той)
  const brandsInCategory = useMemo(() => {
    let list = products;
    if (activeCat !== "all") list = list.filter((p) => p.category_id === activeCat);
    const map = {};
    for (const p of list) {
      if (p.brands?.id && !map[p.brands.id]) {
        map[p.brands.id] = { id: p.brands.id, name: p.brands.name, logo_url: p.brands.logo_url, count: 0 };
      }
      if (p.brands?.id) map[p.brands.id].count++;
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [products, activeCat]);

  const filtered = useMemo(() => {
    let list = products;
    if (activeCat !== "all") list = list.filter((p) => p.category_id === activeCat);
    if (activeBrand !== "all") list = list.filter((p) => p.brand_id === activeBrand);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, activeCat, activeBrand, search]);

  function computeCartTotal(items) {
    const units = [];
    for (const it of items) {
      for (let k = 0; k < it.qty; k++) {
        units.push({ unitPrice: it.unitPrice, categoryId: it.categoryId, categoryPairPrice: it.categoryPairPrice || 0 });
      }
    }
    const byCat = {};
    const noCat = [];
    for (const u of units) {
      if (u.categoryPairPrice > 0 && u.categoryId) {
        if (!byCat[u.categoryId]) byCat[u.categoryId] = [];
        byCat[u.categoryId].push(u);
      } else noCat.push(u);
    }
    let total = 0;
    for (const catId of Object.keys(byCat)) {
      const list = byCat[catId];
      list.sort((a, b) => b.unitPrice - a.unitPrice);
      const pairPrice = list[0].categoryPairPrice;
      const pairs = Math.floor(list.length / 2);
      total += pairs * pairPrice;
      for (let k = pairs * 2; k < list.length; k++) total += list[k].unitPrice;
    }
    for (const u of noCat) total += u.unitPrice;
    return total;
  }

  const rawTotal = computeCartTotal(cart);
  const energyTotal = cart.reduce((s, it) => s + Number(it.unitPrice) * Number(it.qty), 0);
  const finalTotal = Number(totalOverride) > 0 ? Number(totalOverride) : rawTotal;
  const paidTotal = Object.values(payments).reduce((s, v) => s + (Number(v) || 0), 0);
  const remaining = finalTotal - paidTotal;

  async function submitManual() {
    if (!manualForm.name.trim() || !manualForm.price) {
      return alert("Нэр болон үнэ заавал!");
    }
    const qty = Number(manualForm.qty) || 1;
    const price = Number(manualForm.price);
    if (price <= 0) return alert("Үнэ буруу");

    // Зөвхөн сагсанд нэмнэ (вэбэд бараа үүсгэхгүй)
    setCart((c) => [...c, {
      productId: null, // вэб бараагүй
      productName: manualForm.name.trim(),
      size: null,
      color: null,
      qty,
      unitPrice: price,
      image: null,
      stock: 99999, // үлдэгдэл хязгааргүй (DB-д variant байхгүй тул)
      categoryId: null,
      categoryPairPrice: 0,
    }]);
    setManualOpen(false);
    setManualForm({ name: "", price: "", qty: 1, categoryId: "" });
  }

  function addToCart(product, variant) {
    const existing = cart.findIndex(
      (it) => it.productId === product.id && it.size === variant.size && it.color === variant.color
    );
    if (existing >= 0) {
      setCart((c) => {
        const next = [...c];
        if (next[existing].qty + 1 > variant.stock) { alert(`Үлдэгдэл хүрэлцэхгүй (${variant.stock})`); return c; }
        next[existing] = { ...next[existing], qty: next[existing].qty + 1 };
        return next;
      });
    } else {
      setCart((c) => [...c, {
        productId: product.id,
        productName: product.name,
        size: variant.size, color: variant.color, qty: 1,
        unitPrice: finalPrice(product.price, product.discount_percent),
        image: firstImageUrl(product.images),
        stock: variant.stock,
        categoryId: product.category_id,
        categoryPairPrice: Number(product.categories?.pair_price || 0),
      }]);
    }
    setPickProduct(null);
  }

  function removeFromCart(i) { setCart((c) => c.filter((_, x) => x !== i)); }
  function updateQty(i, qty) {
    setCart((c) => {
      const next = [...c];
      const q = Math.max(1, Number(qty));
      if (q > next[i].stock) { alert(`Үлдэгдэл хүрэлцэхгүй (${next[i].stock})`); return c; }
      next[i] = { ...next[i], qty: q };
      return next;
    });
  }
  function clearCart() {
    if (cart.length === 0) return;
    if (!confirm("Хоослох уу?")) return;
    setCart([]); setTotalOverride(""); setPayments({});
  }
  function setPayment(m, v) { setPayments((p) => ({ ...p, [m]: Number(v) || 0 })); }
  function autoFillRemaining(method) {
    const others = Object.entries(payments).filter(([k]) => k !== method).reduce((s, [, v]) => s + (Number(v) || 0), 0);
    setPayment(method, finalTotal - others);
  }

  async function complete() {
    if (cart.length === 0) return alert("Бараа сонгоогүй байна");
    if (Math.abs(remaining) > 1) return alert(`Төлбөр таарахгүй!\nҮлдсэн: ${formatPrice(remaining)}`);
    const activePayments = Object.entries(payments).filter(([, v]) => Number(v) > 0).map(([method, amount]) => ({ method, amount: Number(amount) }));
    if (activePayments.length === 0) return alert("Төлбөр сонгоно уу");
    setBusy(true);
    const res = await fetch("/api/shop-sale-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((it) => ({
          productId: it.productId, productName: it.productName,
          size: it.size, color: it.color, qty: it.qty, unitPrice: it.unitPrice,
        })),
        payments: activePayments,
        branch,
        totalOverride: finalTotal,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return alert(data.error || "Алдаа");
    alert(`✅ Зарагдалт амжилттай!\nНийт: ${formatPrice(data.total)}\n${data.itemCount} ширхэг`);
    setCart([]); setTotalOverride(""); setPayments({});
    await load();
  }

  return (
    <div className="grid h-[calc(100vh-100px)] grid-cols-1 lg:grid-cols-[420px_1fr] gap-3">
      <div className="card flex flex-col overflow-hidden">
        <div className="bg-ink text-cream p-3 flex items-center justify-between">
          <p className="font-display font-700">💼 Касс / POS</p>
          <p className="text-xs opacity-70">{new Date().toLocaleDateString("mn-MN")}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {cart.length === 0 ? (
            <div className="grid h-full place-items-center text-ink-400 text-sm">
              <div className="text-center"><div className="text-4xl mb-2">🛍</div><p>Бараа сонгож нэмнэ үү →</p></div>
            </div>
          ) : cart.map((it, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-cream/50 p-2">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-cream">
                {it.image && <img src={it.image} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{it.productName}</p>
                <p className="text-xs text-ink-400">{[it.size, it.color].filter(Boolean).join(" / ") || "—"}</p>
                <p className="text-sm font-display font-600 mt-0.5">{formatPrice(it.unitPrice)} × {it.qty} = {formatPrice(it.unitPrice * it.qty)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <input type="number" min="1" value={it.qty} onChange={(e) => updateQty(i, e.target.value)}
                  className="w-14 rounded-md border border-ink/15 bg-paper px-2 py-1 text-center text-sm outline-none focus:border-beak" />
                <button onClick={() => removeFromCart(i)} className="text-xs text-red-500 hover:underline">Хасах</button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-ink/10 bg-cream/50 p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-ink-400">Барааны үнэ</span>
            <span className={energyTotal !== rawTotal ? "line-through text-ink-400" : ""}>{formatPrice(energyTotal)}</span>
          </div>
          {energyTotal !== rawTotal && (
            <div className="flex justify-between text-sm text-green-700">
              <span>🎁 1+1 урамшуулал автомат</span>
              <span>{formatPrice(rawTotal)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm items-center">
            <span className="text-ink-400">Тусгай үнэ</span>
            <input type="number" placeholder={String(rawTotal)} value={totalOverride} onChange={(e) => setTotalOverride(e.target.value)}
              className="w-32 rounded-md border border-ink/15 bg-paper px-2 py-1 text-right text-sm outline-none focus:border-beak" />
          </div>
          <div className="flex justify-between font-display font-700 text-lg border-t border-ink/10 pt-2">
            <span>НИЙТ</span><span className="text-beak-600">{formatPrice(finalTotal)}</span>
          </div>
        </div>

        <div className="border-t border-ink/10 p-3">
          <p className="text-xs font-semibold text-ink-400 mb-1.5">🏪 Салбар</p>
          <div className="grid grid-cols-2 gap-1.5">
            {BRANCH_OPTIONS.map((b) => (
              <button key={b.value} onClick={() => setBranch(b.value)}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${branch === b.value ? "bg-ink text-cream border-ink" : "bg-paper border-ink/15"}`}>{b.label}</button>
            ))}
          </div>
        </div>

        <div className="border-t border-ink/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-ink-400">💳 Төлбөр (холимог байж болно)</p>
            <p className={`text-xs font-bold ${Math.abs(remaining) > 1 ? "text-red-500" : "text-green-600"}`}>
              {remaining > 0 ? `Үлдсэн: ${formatPrice(remaining)}` : remaining < 0 ? `Илүү: ${formatPrice(-remaining)}` : "✓ Тэнцсэн"}
            </p>
          </div>
          <div className="space-y-1.5">
            {PAY_OPTIONS.map((p) => (
              <div key={p.value} className="flex items-center gap-2">
                <span className="text-xs w-24">{p.label}</span>
                <input type="number" value={payments[p.value] || ""} onChange={(e) => setPayment(p.value, e.target.value)} placeholder="0"
                  className="flex-1 rounded-md border border-ink/15 bg-paper px-2 py-1.5 text-right text-sm outline-none focus:border-beak" />
                <button onClick={() => autoFillRemaining(p.value)} className="text-xs px-2 py-1 rounded-md bg-cream hover:bg-beak-100">Бүх</button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_2fr] gap-2 p-3 bg-paper border-t border-ink/10">
          <button onClick={clearCart} className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-100">🗑 Цэвэрлэх</button>
          <button onClick={complete} disabled={busy || cart.length === 0}
            className="rounded-xl bg-green-600 text-white px-3 py-3 text-sm font-bold hover:bg-green-700 disabled:opacity-50">
            {busy ? "Бүртгэж..." : `✓ ДУУСГАХ${cart.length > 0 ? ` (${cart.length})` : ""}`}
          </button>
        </div>
      </div>

      <div className="card flex flex-col overflow-hidden">
        <div className="border-b border-ink/10 p-3 space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <input type="text" placeholder="🔍 Бараа хайх..." value={search} onChange={(e) => setSearch(e.target.value)} className="input flex-1" />
            <button
              onClick={() => setManualOpen(true)}
              className="rounded-xl bg-beak text-ink px-4 py-2.5 text-sm font-bold whitespace-nowrap hover:bg-beak-600 hover:text-cream transition shadow-sm"
            >
              ✋ Гараар нэмэх
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => { setActiveCat("all"); setActiveBrand("all"); }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${activeCat === "all" ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"}`}>
              Бүгд ({products.length})
            </button>
            {cats.map((c) => {
              const count = products.filter((p) => p.category_id === c.id).length;
              return (
                <button key={c.id} onClick={() => { setActiveCat(c.id); setActiveBrand("all"); }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${activeCat === c.id ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"}`}>
                  {c.name} ({count})
                </button>
              );
            })}
          </div>

          {brandsInCategory.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-ink/5">
              <button onClick={() => setActiveBrand("all")}
                className={`rounded-full px-3 py-1 text-xs transition ${activeBrand === "all" ? "bg-beak text-ink font-semibold" : "bg-cream/50 text-ink-400 hover:bg-beak-100"}`}>
                🏷 Бүх брэнд
              </button>
              {brandsInCategory.map((b) => (
                <button key={b.id} onClick={() => setActiveBrand(b.id)}
                  className={`flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1 text-xs transition ${activeBrand === b.id ? "bg-beak text-ink font-semibold" : "bg-cream/50 text-ink-400 hover:bg-beak-100"}`}>
                  {b.logo_url ? (
                    <img src={b.logo_url} alt={b.name} className="h-5 w-5 rounded-full object-contain bg-paper p-0.5" />
                  ) : (
                    <span className="h-5 w-5 grid place-items-center rounded-full bg-paper text-[10px]">{b.name[0]}</span>
                  )}
                  {b.name} ({b.count})
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map((p) => (
              <button key={p.id} onClick={() => setPickProduct(p)} disabled={p._totalStock === 0}
                className="card overflow-hidden text-left hover:shadow-soft hover:-translate-y-0.5 transition disabled:opacity-40 disabled:cursor-not-allowed">
                <div className="aspect-square bg-cream">
                  {firstImageUrl(p.images) ? (
                    <img src={firstImageUrl(p.images)} alt={p.name} className="h-full w-full object-cover" />
                  ) : <div className="grid h-full place-items-center text-ink/20">🖼</div>}
                </div>
                <div className="p-2">
                  {p.brands?.name && (
                    <div className="flex items-center gap-1">
                      {p.brands.logo_url && <img src={p.brands.logo_url} alt="" className="h-3 w-3 object-contain" />}
                      <p className="text-[10px] text-beak-600 font-bold uppercase">{p.brands.name}</p>
                    </div>
                  )}
                  <p className="text-xs font-semibold line-clamp-2 leading-tight min-h-[2.4em]">{p.name}</p>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="font-display font-700 text-sm text-beak-600">{formatPrice(finalPrice(p.price, p.discount_percent))}</span>
                    <span className={`text-xs font-semibold ${p._totalStock === 0 ? "text-red-500" : p._totalStock < 5 ? "text-beak-600" : "text-green-600"}`}>{p._totalStock}ш</span>
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && <p className="col-span-full text-center text-ink-400 p-6">Бараа олдсонгүй</p>}
          </div>
        </div>
      </div>

      {pickProduct && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setPickProduct(null)}>
          <div className="card w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-display font-700">{pickProduct.name}</p>
              <button onClick={() => setPickProduct(null)} className="text-2xl text-ink-400">×</button>
            </div>
            {firstImageUrl(pickProduct.images) && (
              <img src={firstImageUrl(pickProduct.images)} alt="" className="h-40 w-full object-cover rounded-lg mb-3" />
            )}
            <p className="text-sm font-display font-700 mb-3">
              Үнэ: <span className="text-beak-600">{formatPrice(finalPrice(pickProduct.price, pickProduct.discount_percent))}</span>
            </p>
            <p className="text-xs font-semibold text-ink-400 mb-2">Хэмжээ / Өнгө:</p>
            <div className="space-y-1.5">
              {pickProduct._variants.filter((v) => v.stock > 0).map((v, i) => (
                <button key={i} onClick={() => addToCart(pickProduct, v)}
                  className="flex w-full items-center justify-between rounded-lg border border-ink/15 bg-cream/30 p-3 hover:bg-beak-100 hover:border-beak transition">
                  <span className="font-semibold">{[v.size, v.color].filter(Boolean).join(" / ") || "—"}</span>
                  <span className="text-xs text-ink-400">📦 {v.stock} үлдсэн</span>
                </button>
              ))}
              {pickProduct._variants.filter((v) => v.stock > 0).length === 0 && (
                <p className="text-center text-sm text-red-500 p-4">Бүгд дууссан</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ ✋ ГАРААР БАРАА ОРУУЛАХ MODAL ============ */}
      {manualOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setManualOpen(false)}>
          <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-display font-700 text-lg">✋ Гараар бараа оруулах</p>
              <button onClick={() => setManualOpen(false)} className="text-2xl text-ink-400">×</button>
            </div>
            <p className="text-xs text-ink-400 mb-4">
              Энэ бараа зөвхөн тухайн зарагдалтад л бүртгэгдэнэ. Вэбэд нэмэгдэхгүй.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink-400 block mb-1">Барааны нэр *</label>
                <input
                  className="input"
                  placeholder="Жишээ: Nike Vomero 5"
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-400 block mb-1">Үнэ (₮) *</label>
                <input
                  className="input"
                  type="number"
                  placeholder="158000"
                  value={manualForm.price}
                  onChange={(e) => setManualForm({ ...manualForm, price: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-400 block mb-1">Тоо ширхэг</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={manualForm.qty}
                  onChange={(e) => setManualForm({ ...manualForm, qty: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={submitManual} className="btn-primary flex-1">
                ✓ Сагсанд нэмэх
              </button>
              <button onClick={() => setManualOpen(false)} className="btn-ghost">Болих</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
