"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, finalPrice, firstImageUrl } from "@/lib/utils";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PAY_OPTIONS = [
  { value: "qpay", label: "QPay шилжүүлэг" },
  { value: "cash", label: "💵 Бэлэн" },
  { value: "card", label: "💳 Карт" },
  { value: "transfer", label: "🏦 Дансаар" },
  { value: "pocket", label: "📱 Pocket" },
];

export default function NewOrderPage() {
  const supabase = createClient();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [pickProduct, setPickProduct] = useState(null);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [customer, setCustomer] = useState({
    name: "", phone: "", address: "", note: "", instagram: "",
    payment_method: "qpay", totalOverride: "",
    order_date: new Date().toISOString().slice(0, 10),
    branch: "branch1",
  });

  async function load() {
    const [{ data: p }, { data: v }] = await Promise.all([
      supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false }),
      supabase.from("product_variants").select("id,product_id,size,color,stock"),
    ]);
    const vbp = {};
    for (const x of (v || [])) {
      if (!vbp[x.product_id]) vbp[x.product_id] = [];
      vbp[x.product_id].push(x);
    }
    setProducts((p || []).map((pr) => ({
      ...pr, _variants: vbp[pr.id] || [],
      _totalStock: (vbp[pr.id] || []).reduce((s, vv) => s + Number(vv.stock || 0), 0),
    })));
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return products.slice(0, 30);
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 30);
  }, [products, search]);

  function addItem(product, variant) {
    setItems((arr) => [...arr, {
      productId: product.id, productName: product.name,
      size: variant.size, color: variant.color, qty: 1,
      unitPrice: finalPrice(product.price, product.discount_percent),
      image: firstImageUrl(product.images), stock: variant.stock,
    }]);
    setPickProduct(null);
    setSearch("");
  }

  function addManualItem() {
    const name = prompt("Барааны нэр:");
    if (!name) return;
    const priceStr = prompt("Үнэ:", "100000");
    if (!priceStr) return;
    setItems((arr) => [...arr, {
      productId: null, productName: name, size: null, color: null,
      qty: 1, unitPrice: Number(priceStr) || 0, image: null, stock: 999,
    }]);
  }

  function removeItem(i) { setItems((arr) => arr.filter((_, x) => x !== i)); }
  function updateQty(i, qty) {
    setItems((arr) => {
      const next = [...arr];
      next[i] = { ...next[i], qty: Math.max(1, Number(qty)) };
      return next;
    });
  }

  const rawTotal = items.reduce((s, it) => s + Number(it.unitPrice) * Number(it.qty), 0);
  const DELIVERY_FEE = 7000;
  const finalTotal = customer.totalOverride > 0 ? Number(customer.totalOverride) : rawTotal + DELIVERY_FEE;

  async function submit() {
    if (!customer.name.trim()) return alert("Захиалагчийн нэр заавал");
    if (!customer.phone.trim()) return alert("Утас заавал");
    if (!customer.address.trim()) return alert("Хаяг заавал");
    if (items.length === 0) return alert("Бараа сонгоно уу");

    setBusy(true);
    const res = await fetch("/api/manual-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: customer.name, phone: customer.phone,
        address: customer.address, note: customer.note, instagram: customer.instagram,
        order_date: customer.order_date,
        branch: customer.branch,
        items: items.map((it) => ({
          productId: it.productId, productName: it.productName,
          size: it.size, color: it.color, qty: it.qty, unitPrice: it.unitPrice,
        })),
        total: finalTotal,
        payment_method: customer.payment_method,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return alert(data.error || "Алдаа");
    alert(`✅ Захиалга бүртгэгдсэн!\n\nКод: #${data.order_code}\nНийт: ${formatPrice(finalTotal)}\n\nХүргэлтэд автоматаар орсон.`);
    router.push("/admin/orders");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-700">📝 Гараар захиалга үүсгэх</h2>
        <Link href="/admin/orders" className="text-sm text-ink-400 hover:text-ink">← Буцах</Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <h3 className="font-display font-700">👤 Захиалагч</h3>
            <input className="input" placeholder="Овог нэр *"
              value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
            <input className="input" placeholder="Утас (88112233) *"
              value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
            <textarea className="input min-h-20" placeholder="Хаяг * (дүүрэг, хороо, байр)"
              value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
            <input className="input" placeholder="📷 Instagram хаяг (@huurhun_clothes гэх мэт)"
              value={customer.instagram} onChange={(e) => setCustomer({ ...customer, instagram: e.target.value })} />
            <textarea className="input min-h-16" placeholder="💬 Нэмэлт тэмдэглэл"
              value={customer.note} onChange={(e) => setCustomer({ ...customer, note: e.target.value })} />
          </div>

          <div className="card p-4">
            <h3 className="font-display font-700 mb-3">🏪 Салбар</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "branch1", label: "Салбар 1" },
                { value: "branch2", label: "Салбар 2" },
              ].map((b) => (
                <button
                  key={b.value}
                  onClick={() => setCustomer({ ...customer, branch: b.value })}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    customer.branch === b.value ? "bg-ink text-cream border-ink" : "bg-paper border-ink/15"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card p-4">
            <h3 className="font-display font-700 mb-3">📅 Захиалгын огноо</h3>
            <input
              type="date"
              className="input"
              value={customer.order_date}
              onChange={(e) => setCustomer({ ...customer, order_date: e.target.value })}
              max={new Date().toISOString().slice(0, 10)}
            />
            <p className="text-xs text-ink-400 mt-2">
              💡 Өнгөрсөн өдрийн захиалга оруулж болно (тайланд тэр өдрөөр орно)
            </p>
          </div>

          <div className="card p-4">
            <h3 className="font-display font-700 mb-3">💳 Төлбөр</h3>
            <div className="flex flex-wrap gap-2">
              {PAY_OPTIONS.map((p) => (
                <button key={p.value} onClick={() => setCustomer({ ...customer, payment_method: p.value })}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    customer.payment_method === p.value ? "bg-ink text-cream" : "bg-cream hover:bg-beak-100"
                  }`}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-700">🛍 Бараа сонгох</h3>
              <button onClick={addManualItem} className="text-xs text-beak-600 hover:underline">+ Гараар нэмэх</button>
            </div>
            <input type="text" className="input" placeholder="🔍 Бараа хайх..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && (
              <div className="max-h-60 overflow-y-auto space-y-1 rounded-lg border border-ink/10 bg-cream/30 p-2">
                {filtered.map((p) => (
                  <button key={p.id} onClick={() => setPickProduct(p)}
                    className="flex w-full items-center gap-2 rounded-md p-1.5 hover:bg-paper transition text-left">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-cream">
                      {firstImageUrl(p.images) && <img src={firstImageUrl(p.images)} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <span className="flex-1 truncate text-sm font-semibold">{p.name}</span>
                    <span className="text-xs text-ink-400">{formatPrice(finalPrice(p.price, p.discount_percent))}</span>
                  </button>
                ))}
                {filtered.length === 0 && <p className="p-2 text-center text-sm text-ink-400">Олдсонгүй</p>}
              </div>
            )}
          </div>

          <div className="card p-4">
            <h3 className="font-display font-700 mb-3">🧾 Сагс ({items.length})</h3>
            {items.length === 0 ? (
              <p className="text-sm text-ink-400 text-center py-4">Бараа сонгоогүй</p>
            ) : (
              <div className="space-y-2">
                {items.map((it, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-cream/50 p-2">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-cream">
                      {it.image && <img src={it.image} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{it.productName}</p>
                      <p className="text-xs text-ink-400">
                        {[it.size, it.color].filter(Boolean).join(" / ") || "—"} · {formatPrice(it.unitPrice)}
                      </p>
                    </div>
                    <input type="number" min="1" value={it.qty} onChange={(e) => updateQty(i, e.target.value)}
                      className="w-14 rounded-md border border-ink/15 bg-paper px-2 py-1 text-center text-sm" />
                    <button onClick={() => removeItem(i)} className="text-red-500 text-sm hover:underline">✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 border-t border-ink/10 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-ink-400">Барааны үнэ</span><span>{formatPrice(rawTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-400">Хүргэлт</span><span>{formatPrice(DELIVERY_FEE)}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-ink-400">Тусгай дүн</span>
                <input type="number" placeholder={String(rawTotal + DELIVERY_FEE)}
                  value={customer.totalOverride}
                  onChange={(e) => setCustomer({ ...customer, totalOverride: e.target.value })}
                  className="w-28 rounded-md border border-ink/15 bg-paper px-2 py-1 text-right text-sm" />
              </div>
              <div className="flex justify-between font-display font-700 text-lg pt-2 border-t border-ink/10">
                <span>НИЙТ</span><span className="text-beak-600">{formatPrice(finalTotal)}</span>
              </div>
            </div>

            <button onClick={submit} disabled={busy || items.length === 0} className="btn-primary w-full mt-4">
              {busy ? "Үүсгэж байна..." : "✓ Захиалга үүсгэх → хүргэлтэд орох"}
            </button>
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
            <p className="text-sm font-display font-700 mb-3">
              Үнэ: <span className="text-beak-600">{formatPrice(finalPrice(pickProduct.price, pickProduct.discount_percent))}</span>
            </p>
            <p className="text-xs font-semibold text-ink-400 mb-2">Хэмжээ / Өнгө:</p>
            <div className="space-y-1.5">
              {pickProduct._variants.filter((v) => v.stock > 0).map((v, i) => (
                <button key={i} onClick={() => addItem(pickProduct, v)}
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
    </div>
  );
}
