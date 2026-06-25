"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, finalPrice, firstImageUrl, imagesForColor } from "@/lib/utils";

const PAY_OPTIONS = [
  { value: "cash", label: "💵 Бэлэн" },
  { value: "card", label: "💳 Карт" },
  { value: "pocket", label: "📱 Pocket" },
  { value: "storepay", label: "🛍 StorePay" },
  { value: "dans", label: "💰 Данс" },
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
  const [pickColor, setPickColor] = useState(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ name: "", price: "", qty: 1, categoryId: "" });
  const [manualBusy, setManualBusy] = useState(false);
  // Ачаа орох
  const [restockOpen, setRestockOpen] = useState(null); // { product, variant }
  const [restockBranch, setRestockBranch] = useState("branch1");
  const [restockQty, setRestockQty] = useState("10");
  const [restockNote, setRestockNote] = useState("");
  const [restockBusy, setRestockBusy] = useState(false);
  // Өнөөдрийн түүх
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySales, setHistorySales] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
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
    // Variants-ийг эрэмбэлэх: өнгөөр → размераар
    const SIZE_ORDER = { XS: 1, S: 2, M: 3, L: 4, XL: 5, "2XL": 6, "3XL": 7, "4XL": 8 };
    const sizeKey = (s) => {
      if (!s) return 0;
      const upper = String(s).toUpperCase();
      if (SIZE_ORDER[upper]) return SIZE_ORDER[upper];
      const n = parseFloat(s);
      return isNaN(n) ? 1000 : n;
    };
    for (const pid of Object.keys(variantsByProduct)) {
      variantsByProduct[pid].sort((a, b) => {
        const cA = a.color || "ZZZ";
        const cB = b.color || "ZZZ";
        if (cA !== cB) return cA.localeCompare(cB, "mn");
        return sizeKey(a.size) - sizeKey(b.size);
      });
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

  // === 📥 Ачаа нэмэх ===
  async function submitRestock() {
    if (!restockOpen) return;
    const { product, variant } = restockOpen;
    const qty = Number(restockQty);
    if (qty < 1) return alert("Зөв тоо оруулна уу");
    setRestockBusy(true);
    const res = await fetch("/api/restock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        productName: product.name,
        size: variant.size,
        color: variant.color,
        qty,
        note: restockNote || null,
        branch: restockBranch,
      }),
    });
    const data = await res.json();
    setRestockBusy(false);
    if (!res.ok) return alert(data.error || "Алдаа");
    alert(`✅ ${qty} ширхэг нэмэгдсэн (${restockBranch === "branch1" ? "Салбар 1" : "Салбар 2"})\nНийт ${data.newStock}`);
    setRestockOpen(null);
    setRestockQty("10");
    setRestockNote("");
    setPickProduct(null);
    await load();
  }

  // === 📋 Өнөөдрийн түүх ===
  async function loadHistory() {
    setHistoryLoading(true);
    const t = new Date();
    const start = new Date(t.getFullYear(), t.getMonth(), t.getDate()).toISOString();
    const { data } = await supabase
      .from("sales")
      .select("*")
      .eq("channel", "shop")
      .gte("created_at", start)
      .order("created_at", { ascending: false });
    setHistorySales(data || []);
    setHistoryLoading(false);
  }
  function openHistory() {
    setHistoryOpen(true);
    loadHistory();
  }

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
    <div className="grid lg:h-[calc(100vh-100px)] grid-cols-1 lg:grid-cols-[420px_1fr] gap-3">
      <div className="card flex flex-col lg:overflow-hidden h-[80vh] lg:h-auto">
        <div className="bg-ink text-cream p-3 flex items-center justify-between shrink-0">
          <p className="font-display font-700">💼 Касс / POS</p>
          <div className="flex items-center gap-2">
            <a
              href="/kassa/manual-order"
              className="rounded-full bg-beak text-ink hover:bg-beak-600 hover:text-cream px-3 py-1 text-xs font-bold transition"
            >
              📝 Гараар захиалга
            </a>
            <button
              onClick={openHistory}
              className="rounded-full bg-cream/20 hover:bg-cream/30 px-3 py-1 text-xs font-bold transition"
            >
              📋 Өнөөдрийн түүх
            </button>
            <p className="text-xs opacity-70">{new Date().toLocaleDateString("mn-MN")}</p>
          </div>
        </div>

        {/* САГС — scroll болно */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px]">
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

        {/* ДООРХ ХЭСЭГ — fixed, түр scrollable summary */}
        <div className="shrink-0 max-h-[55vh] overflow-y-auto">
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
              <p className="text-xs font-semibold text-ink-400">💳 Төлбөр</p>
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
        </div>

        {/* ДУУСГАХ — ҮРГЭЛЖ ХАРАГДАНА (sticky bottom) */}
        <div className="grid grid-cols-[1fr_2fr] gap-2 p-3 bg-paper border-t-2 border-ink/20 shrink-0 sticky bottom-0 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
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

      {pickProduct && (() => {
        const variantsInStock = pickProduct._variants.filter((v) => v.stock > 0);
        // Variants бүлэглэх — өнгөөр
        const colorMap = {};
        for (const v of variantsInStock) {
          const key = v.color || "—";
          if (!colorMap[key]) colorMap[key] = [];
          colorMap[key].push(v);
        }
        const colors = Object.keys(colorMap);
        // Идэвхтэй өнгөтэй variant-ууд
        const activeColor = pickColor || colors[0] || null;
        const displayVariants = activeColor && colorMap[activeColor] ? colorMap[activeColor] : variantsInStock;
        // Идэвхтэй өнгөтэй тохирох зураг
        const matchedImages = imagesForColor(pickProduct.images, activeColor);
        const shownImage = matchedImages?.[0]?.url || firstImageUrl(pickProduct.images);

        return (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => { setPickProduct(null); setPickColor(null); }}>
            <div className="card w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-display font-700">{pickProduct.name}</p>
                <button onClick={() => { setPickProduct(null); setPickColor(null); }} className="text-2xl text-ink-400">×</button>
              </div>

              {shownImage && (
                <img src={shownImage} alt="" className="h-48 w-full object-cover rounded-lg mb-3 transition" />
              )}

              <p className="text-sm font-display font-700 mb-3">
                Үнэ: <span className="text-beak-600">{formatPrice(finalPrice(pickProduct.price, pickProduct.discount_percent))}</span>
              </p>

              {/* Өнгө сонгох chip-үүд */}
              {colors.length > 1 && (
                <>
                  <p className="text-xs font-semibold text-ink-400 mb-2">🎨 Өнгө сонгох:</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => setPickColor(c)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
                          activeColor === c
                            ? "bg-ink text-cream border-ink"
                            : "bg-paper border-ink/15 hover:border-ink/40"
                        }`}
                      >
                        {c} <span className="opacity-60">({colorMap[c].length})</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <p className="text-xs font-semibold text-ink-400 mb-2">📏 Хэмжээ сонгох:</p>
              <div className="space-y-1.5">
                {displayVariants.map((v, i) => (
                  <div key={i} className="flex items-stretch gap-1.5">
                    <button
                      onClick={() => { addToCart(pickProduct, v); setPickColor(null); }}
                      className="flex-1 flex items-center justify-between rounded-lg border border-ink/15 bg-cream/30 p-3 hover:bg-beak-100 hover:border-beak transition"
                    >
                      <span className="font-semibold">{[v.size, v.color].filter(Boolean).join(" / ") || "—"}</span>
                      <span className="text-xs text-ink-400">📦 {v.stock} үлдсэн</span>
                    </button>
                    <button
                      onClick={() => {
                        setRestockOpen({ product: pickProduct, variant: v });
                        setRestockBranch("branch1");
                        setRestockQty("10");
                        setRestockNote("");
                      }}
                      className="w-14 grid place-items-center rounded-lg border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition font-bold"
                      title="Ачаа орох"
                    >
                      📥
                    </button>
                  </div>
                ))}
                {variantsInStock.length === 0 && (
                  <div className="space-y-1.5">
                    <p className="text-center text-sm text-red-500 p-4 bg-red-50 rounded-lg">Бүгд дууссан</p>
                    {pickProduct._variants.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setRestockOpen({ product: pickProduct, variant: v });
                          setRestockBranch("branch1");
                          setRestockQty("10");
                          setRestockNote("");
                        }}
                        className="flex w-full items-center justify-between rounded-lg border border-green-300 bg-green-50 text-green-700 p-3 hover:bg-green-100 transition"
                      >
                        <span className="font-semibold">📥 {[v.size, v.color].filter(Boolean).join(" / ") || "—"} (ачаа орох)</span>
                        <span className="text-xs">одоо: {v.stock}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* ========= 📥 АЧАА ОРОХ MODAL (POS) ========= */}
      {restockOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4" onClick={() => !restockBusy && setRestockOpen(null)}>
          <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-display font-700 text-lg">📥 Ачаа орох</p>
              <button onClick={() => setRestockOpen(null)} className="text-2xl text-ink-400">×</button>
            </div>
            <p className="text-sm font-semibold mb-1">{restockOpen.product.name}</p>
            <p className="text-xs text-ink-400 mb-4">
              {[restockOpen.variant.size, restockOpen.variant.color].filter(Boolean).join(" / ") || "—"}
              {" · "}одоо: 📦 {restockOpen.variant.stock || 0}
            </p>

            <p className="text-xs font-semibold text-ink-400 mb-2">🏪 Аль салбарт?</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { v: "branch1", l: "🏪 Салбар 1" },
                { v: "branch2", l: "🏪 Салбар 2" },
              ].map((b) => (
                <button
                  key={b.v}
                  onClick={() => setRestockBranch(b.v)}
                  className={`rounded-lg border-2 px-3 py-2.5 text-sm font-bold transition ${
                    restockBranch === b.v ? "bg-ink text-cream border-ink" : "bg-paper border-ink/15"
                  }`}
                >
                  {b.l}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink-400 block mb-1">Хэдэн ширхэг?</label>
                <input
                  type="number" min="1"
                  className="input"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-400 block mb-1">Тэмдэглэл</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Заавал биш"
                  value={restockNote}
                  onChange={(e) => setRestockNote(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={submitRestock} disabled={restockBusy} className="btn-primary flex-1">
                {restockBusy ? "Нэмж..." : `✓ ${restockBranch === "branch1" ? "С1" : "С2"}-д нэмэх`}
              </button>
              <button onClick={() => setRestockOpen(null)} disabled={restockBusy} className="btn-ghost">Болих</button>
            </div>
          </div>
        </div>
      )}

      {/* ========= 📋 ӨНӨӨДРИЙН ТҮҮХ MODAL ========= */}
      {historyOpen && (() => {
        // Зарагдалтыг order_code-аар бүлэглэх
        const byTx = {};
        for (const s of historySales) {
          const key = s.order_code || `single-${s.id}`;
          if (!byTx[key]) {
            byTx[key] = {
              order_code: s.order_code,
              created_at: s.created_at,
              payment_method: s.payment_method,
              branch: s.branch,
              items: [],
              total: 0,
              qty: 0,
            };
          }
          byTx[key].items.push(s);
          byTx[key].total += Number(s.total || 0);
          byTx[key].qty += Number(s.qty || 0);
        }
        const txs = Object.values(byTx).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const grand = txs.reduce((s, x) => s + x.total, 0);
        const grandQty = txs.reduce((s, x) => s + x.qty, 0);

        const PAY_LABELS_LOCAL = {
          cash: "💵 Бэлэн", card: "💳 Карт", pocket: "📱 Pocket",
          storepay: "🛍 StorePay", dans: "🏦 Данс", qpay: "QPay",
        };
        const payL = (m) => {
          if (!m) return "Бусад";
          if (typeof m === "string" && m.startsWith("mixed:")) return "🔀 Холимог";
          return PAY_LABELS_LOCAL[m] || m;
        };
        const timeStr = (d) => {
          const dt = new Date(d);
          return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
        };

        return (
          <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4" onClick={() => setHistoryOpen(false)}>
            <div className="card w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="bg-ink text-cream p-3 flex items-center justify-between rounded-t-2xl">
                <p className="font-display font-700">📋 Өнөөдрийн зарагдалт</p>
                <button onClick={() => setHistoryOpen(false)} className="text-2xl">×</button>
              </div>
              <div className="bg-cream/50 px-4 py-3 border-b border-ink/10 flex items-center justify-between">
                <div>
                  <p className="text-xs text-ink-400">Нийт {txs.length} гүйлгээ</p>
                  <p className="font-display font-700 text-xl text-beak-600">{formatPrice(grand)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ink-400">Ширхэг</p>
                  <p className="font-display font-700 text-xl text-green-600">{grandQty}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {historyLoading ? (
                  <p className="text-center text-ink-400 p-4">Ачаалж байна...</p>
                ) : txs.length === 0 ? (
                  <div className="grid place-items-center h-32 text-ink-400 text-sm">
                    <div className="text-center">
                      <div className="text-3xl mb-2">📋</div>
                      <p>Өнөөдөр зарагдалт алга</p>
                    </div>
                  </div>
                ) : txs.map((tx, idx) => (
                  <div key={tx.order_code || idx} className="rounded-lg bg-cream/50 p-3 border border-ink/5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-ink text-cream px-2 py-0.5 rounded">
                          🕐 {timeStr(tx.created_at)}
                        </span>
                        <span className="text-xs text-ink-400">#{tx.order_code || "—"}</span>
                      </div>
                      <p className="font-display font-700 text-beak-600">{formatPrice(tx.total)}</p>
                    </div>
                    <div className="space-y-0.5 mb-2">
                      {tx.items.map((it, j) => (
                        <div key={j} className="flex items-center gap-2 text-sm">
                          <span className="flex-1 truncate">
                            <b>{it.product_name}</b>
                            {(it.size || it.color) && (
                              <span className="text-xs text-ink-400 ml-1">
                                ({[it.size, it.color].filter(Boolean).join(" / ")})
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-ink-400">×{it.qty}</span>
                          <span className="text-sm font-display font-600 w-20 text-right">{formatPrice(it.total)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-ink/5">
                      <span className="rounded-full bg-paper border border-ink/15 px-2 py-0.5 text-xs">{payL(tx.payment_method)}</span>
                      {tx.branch && (
                        <span className="rounded-full bg-beak-100 border border-beak/30 text-beak-600 px-2 py-0.5 text-xs font-semibold">
                          🏪 {tx.branch === "branch1" ? "Салбар 1" : "Салбар 2"}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-ink-400">{tx.qty} ширхэг</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-ink/10 p-3 bg-paper rounded-b-2xl">
                <button
                  onClick={loadHistory}
                  className="w-full rounded-lg border border-ink/15 bg-cream/30 px-3 py-2 text-sm font-semibold hover:bg-cream transition"
                  disabled={historyLoading}
                >
                  {historyLoading ? "Ачаалж..." : "🔄 Шинэчлэх"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
