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

export default function POSPage() {
  const supabase = createClient();
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [activeCat, setActiveCat] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [pickProduct, setPickProduct] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [branch, setBranch] = useState("branch1");
  const [totalOverride, setTotalOverride] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [{ data: c }, { data: p }, { data: v }] = await Promise.all([
      supabase.from("categories").select("id,name").order("sort"),
      supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false }),
      supabase.from("product_variants").select("id,product_id,size,color,stock"),
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

  const filtered = useMemo(() => {
    let list = products;
    if (activeCat !== "all") list = list.filter((p) => p.category_id === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, activeCat, search]);

  const rawTotal = cart.reduce((s, it) => s + Number(it.unitPrice) * Number(it.qty), 0);
  const finalTotal = Number(totalOverride) > 0 ? Number(totalOverride) : rawTotal;
  const discount = rawTotal - finalTotal;

  function addToCart(product, variant, qty = 1) {
    const existing = cart.findIndex(
      (it) => it.productId === product.id && it.size === variant.size && it.color === variant.color
    );
    if (existing >= 0) {
      setCart((c) => {
        const next = [...c];
        if (next[existing].qty + qty > variant.stock) {
          alert(`Үлдэгдэл хүрэлцэхгүй (${variant.stock} ширхэг)`);
          return c;
        }
        next[existing] = { ...next[existing], qty: next[existing].qty + qty };
        return next;
      });
    } else {
      setCart((c) => [
        ...c,
        {
          productId: product.id,
          productName: product.name,
          size: variant.size,
          color: variant.color,
          qty,
          unitPrice: finalPrice(product.price, product.discount_percent),
          image: firstImageUrl(product.images),
          stock: variant.stock,
        },
      ]);
    }
    setPickProduct(null);
  }

  function removeFromCart(i) {
    setCart((c) => c.filter((_, x) => x !== i));
  }

  function updateQty(i, qty) {
    setCart((c) => {
      const next = [...c];
      const q = Math.max(1, Number(qty));
      if (q > next[i].stock) {
        alert(`Үлдэгдэл хүрэлцэхгүй (${next[i].stock} ширхэг)`);
        return c;
      }
      next[i] = { ...next[i], qty: q };
      return next;
    });
  }

  function clearCart() {
    if (cart.length === 0) return;
    if (!confirm("Сагсыг хоослох уу?")) return;
    setCart([]);
    setTotalOverride("");
  }

  async function complete() {
    if (cart.length === 0) return alert("Бараа сонгоогүй байна");
    setBusy(true);
    const res = await fetch("/api/shop-sale-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          size: it.size,
          color: it.color,
          qty: it.qty,
          unitPrice: it.unitPrice,
        })),
        paymentMethod,
        branch,
        totalOverride: Number(totalOverride) || null,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return alert(data.error || "Алдаа гарлаа");
    alert(`✅ Зарагдалт амжилттай!\n\nНийт: ${formatPrice(data.total)}\n${data.discount > 0 ? `Хямдрал: ${formatPrice(data.discount)}\n` : ""}${data.itemCount} ширхэг бараа`);
    setCart([]);
    setTotalOverride("");
    await load();
  }

  return (
    <div className="grid h-[calc(100vh-120px)] grid-cols-1 lg:grid-cols-[420px_1fr] gap-3">
      <div className="card flex flex-col overflow-hidden">
        <div className="bg-ink text-cream p-3 flex items-center justify-between">
          <p className="font-display font-700">💼 Касс / POS</p>
          <p className="text-xs opacity-70">{new Date().toLocaleDateString("mn-MN")}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {cart.length === 0 ? (
            <div className="grid h-full place-items-center text-ink-400 text-sm">
              <div className="text-center">
                <div className="text-4xl mb-2">🛍</div>
                <p>Бараа сонгож нэмнэ үү →</p>
              </div>
            </div>
          ) : (
            cart.map((it, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-cream/50 p-2">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-cream">
                  {it.image && <img src={it.image} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{it.productName}</p>
                  <p className="text-xs text-ink-400">
                    {[it.size, it.color].filter(Boolean).join(" / ") || "—"}
                  </p>
                  <p className="text-sm font-display font-600 mt-0.5">
                    {formatPrice(it.unitPrice)} × {it.qty} = {formatPrice(it.unitPrice * it.qty)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <input
                    type="number"
                    min="1"
                    value={it.qty}
                    onChange={(e) => updateQty(i, e.target.value)}
                    className="w-14 rounded-md border border-ink/15 bg-paper px-2 py-1 text-center text-sm outline-none focus:border-beak"
                  />
                  <button onClick={() => removeFromCart(i)} className="text-xs text-red-500 hover:underline">Хасах</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-ink/10 bg-cream/50 p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-ink-400">Барааны үнэ</span>
            <span>{formatPrice(rawTotal)}</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-ink-400">Хямдрал / Тусгай үнэ</span>
            <input
              type="number"
              placeholder={String(rawTotal)}
              value={totalOverride}
              onChange={(e) => setTotalOverride(e.target.value)}
              className="w-32 rounded-md border border-ink/15 bg-paper px-2 py-1 text-right text-sm outline-none focus:border-beak"
            />
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-700">
              <span>📉 Хямдарсан</span>
              <span>-{formatPrice(discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-display font-700 text-lg border-t border-ink/10 pt-2">
            <span>НИЙТ</span>
            <span className="text-beak-600">{formatPrice(finalTotal)}</span>
          </div>
        </div>

        <div className="border-t border-ink/10 p-3 space-y-2">
          <div>
            <p className="text-xs font-semibold text-ink-400 mb-1.5">🏪 Салбар</p>
            <div className="grid grid-cols-2 gap-1.5">
              {BRANCH_OPTIONS.map((b) => (
                <button
                  key={b.value}
                  onClick={() => setBranch(b.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    branch === b.value ? "bg-ink text-cream border-ink" : "bg-paper border-ink/15"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-ink-400 mb-1.5">💳 Төлбөр</p>
            <div className="grid grid-cols-3 gap-1.5">
              {PAY_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPaymentMethod(p.value)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                    paymentMethod === p.value ? "bg-beak text-ink border-beak" : "bg-paper border-ink/15"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_2fr] gap-2 p-3 bg-paper border-t border-ink/10">
          <button onClick={clearCart} className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-100 transition">
            🗑 Цэвэрлэх
          </button>
          <button
            onClick={complete}
            disabled={busy || cart.length === 0}
            className="rounded-xl bg-green-600 text-white px-3 py-3 text-sm font-bold hover:bg-green-700 transition disabled:opacity-50"
          >
            {busy ? "Бүртгэж байна..." : `✓ ДУУСГАХ${cart.length > 0 ? ` (${cart.length})` : ""}`}
          </button>
        </div>
      </div>

      <div className="card flex flex-col overflow-hidden">
        <div className="border-b border-ink/10 p-3 space-y-2">
          <input
            type="text"
            placeholder="🔍 Бараа хайх (нэр)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input"
          />
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveCat("all")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                activeCat === "all" ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"
              }`}
            >
              Бүгд ({products.length})
            </button>
            {cats.map((c) => {
              const count = products.filter((p) => p.category_id === c.id).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    activeCat === c.id ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"
                  }`}
                >
                  {c.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => setPickProduct(p)}
                disabled={p._totalStock === 0}
                className="card overflow-hidden text-left hover:shadow-soft hover:-translate-y-0.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="aspect-square bg-cream">
                  {firstImageUrl(p.images) ? (
                    <img src={firstImageUrl(p.images)} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-ink/20">🖼</div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-semibold line-clamp-2 leading-tight min-h-[2.4em]">{p.name}</p>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="font-display font-700 text-sm text-beak-600">
                      {formatPrice(finalPrice(p.price, p.discount_percent))}
                    </span>
                    <span className={`text-xs font-semibold ${
                      p._totalStock === 0 ? "text-red-500" : p._totalStock < 5 ? "text-beak-600" : "text-green-600"
                    }`}>
                      {p._totalStock}ш
                    </span>
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full text-center text-ink-400 p-6">Бараа олдсонгүй</p>
            )}
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
            <p className="text-xs font-semibold text-ink-400 mb-2">Хэмжээ / Өнгө сонгох:</p>
            <div className="space-y-1.5">
              {pickProduct._variants.filter((v) => v.stock > 0).map((v, i) => {
                const label = [v.size, v.color].filter(Boolean).join(" / ") || "—";
                return (
                  <button
                    key={i}
                    onClick={() => addToCart(pickProduct, v, 1)}
                    className="flex w-full items-center justify-between rounded-lg border border-ink/15 bg-cream/30 p-3 hover:bg-beak-100 hover:border-beak transition"
                  >
                    <span className="font-semibold">{label}</span>
                    <span className="text-xs text-ink-400">📦 {v.stock} үлдсэн</span>
                  </button>
                );
              })}
              {pickProduct._variants.filter((v) => v.stock > 0).length === 0 && (
                <p className="text-center text-sm text-red-500 p-4">Бүгд дууссан байна</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
