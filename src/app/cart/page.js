"use client";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice, DELIVERY_FEE } from "@/lib/utils";

export default function CartPage() {
  const { items, updateQty, remove, total, subtotal, ready } = useCart();

  if (!ready) return null;

  const savings = subtotal - total;
  const grandTotal = total + (items.length > 0 ? DELIVERY_FEE : 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl font-700">Сагс</h1>

      {items.length === 0 ? (
        <div className="card mt-8 grid place-items-center gap-4 py-20 text-center">
          <p className="text-ink-400">Сагс хоосон байна.</p>
          <Link href="/" className="btn-accent">Дэлгүүр үзэх</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {items.map((it, idx) => (
              <div key={idx} className="card flex gap-4 p-3">
                <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-cream">
                  {it.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between gap-2">
                    <h3 className="font-semibold">{it.name}</h3>
                    <button onClick={() => remove(idx)} className="text-sm text-ink/40 hover:text-beak-600">Устгах</button>
                  </div>
                  <p className="text-sm text-ink-400">
                    {[it.size && `Хэмжээ: ${it.size}`, it.color && `Өнгө: ${it.color}`].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center rounded-full border border-ink/15">
                      <button onClick={() => updateQty(idx, it.qty - 1)} className="px-3 py-1.5">−</button>
                      <span className="w-7 text-center text-sm font-semibold">{it.qty}</span>
                      <button onClick={() => updateQty(idx, it.qty + 1)} className="px-3 py-1.5">+</button>
                    </div>
                    <span className="font-display font-600">{formatPrice(it.unitPrice * it.qty)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card h-fit p-6">
            <h2 className="font-display text-lg font-600">Нийт</h2>
            <div className="mt-4 flex justify-between text-ink-400">
              <span>Барааны үнэ</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {savings > 0 && (
              <div className="mt-2 flex justify-between text-beak-600 font-semibold">
                <span>🎁 Багц урамшуулал</span>
                <span>−{formatPrice(savings)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between text-ink-400">
              <span>🚚 Хүргэлт</span>
              <span>{formatPrice(DELIVERY_FEE)}</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-ink/10 pt-3 text-lg font-700">
              <span>Төлөх дүн</span>
              <span className="font-display">{formatPrice(grandTotal)}</span>
            </div>
            <Link href="/checkout" className="btn-primary mt-6 w-full">Захиалах</Link>
          </div>
        </div>
      )}
    </div>
  );
}
