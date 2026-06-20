"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { finalPrice, formatPrice, imagesForColor } from "@/lib/utils";

export default function ProductView({ product, variants }) {
  const router = useRouter();
  const { add } = useCart();
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState("");
  const [activeImg, setActiveImg] = useState(0);

  const sizes = useMemo(
    () => [...new Set(variants.map((v) => v.size).filter(Boolean))],
    [variants]
  );
  const colors = useMemo(
    () => [...new Set(variants.map((v) => v.color).filter(Boolean))],
    [variants]
  );

  const shownImages = useMemo(
    () => imagesForColor(product.images, color),
    [product.images, color]
  );

  const getStock = (s, c) => {
    return variants
      .filter((v) => (!sizes.length || v.size === s) && (!colors.length || v.color === c))
      .reduce((sum, v) => sum + Number(v.stock || 0), 0);
  };

  // === Автомат сонгох ===
  // Эхний өнгө + хамгийн эхний үлдэгдэлтэй размер
  useEffect(() => {
    if (!color && colors.length > 0) {
      setColor(colors[0]);
    }
  }, [colors]);

  useEffect(() => {
    if (!size && sizes.length > 0) {
      // Үлдэгдэлтэй эхний размер сонгох
      const firstAvailable = sizes.find((s) => getStock(s, color || colors[0]) > 0);
      if (firstAvailable) setSize(firstAvailable);
    }
  }, [sizes, color]);

  const stock = getStock(size, color);
  const needsSize = sizes.length > 0 && !size;
  const needsColor = colors.length > 0 && !color;
  const unit = finalPrice(product.price, product.discount_percent);
  const totalStock = variants.reduce((s, v) => s + Number(v.stock || 0), 0);
  const allOut = totalStock === 0;

  function pickColor(c) {
    setColor(c);
    setMsg("");
    setQty(1);
    setActiveImg(0);
  }

  function handleAdd() {
    if (allOut) return setMsg("Энэ бараа дууссан байна");
    if (needsSize) return setMsg("Хэмжээгээ сонгоно уу");
    if (needsColor) return setMsg("Өнгөө сонгоно уу");
    if (stock < 1) return setMsg("Энэ сонголт дууссан байна");
    if (qty > stock) return setMsg(`Зөвхөн ${stock} ширхэг үлдсэн байна`);
    add({
      productId: product.id,
      name: product.name,
      image: shownImages[0]?.url || null,
      size: size || null,
      color: color || null,
      qty,
      unitPrice: unit,
    });
    setMsg("Сагсанд нэмэгдлээ ✓");
  }

  const list = shownImages.length ? shownImages : [{ url: null }];

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
      {/* ===== ЗҮҮН ТАЛ — ЗУРАГ ===== */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        {list.length > 1 && (
          <div className="flex flex-row gap-2 sm:flex-col sm:w-[72px] sm:shrink-0 overflow-x-auto">
            {list.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`aspect-square w-16 sm:w-full shrink-0 overflow-hidden rounded-lg border-2 transition ${
                  activeImg === i ? "border-ink" : "border-transparent hover:border-ink/20"
                }`}
              >
                {img.url ? (
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-cream dot-grid" />
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 aspect-square overflow-hidden rounded-xl2 bg-cream">
          {list[activeImg]?.url ? (
            <img src={list[activeImg].url} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-ink/20 dot-grid text-lg">Зураггүй</div>
          )}
        </div>
      </div>

      {/* ===== БАРУУН ТАЛ — МЭДЭЭЛЭЛ ===== */}
      <div>
        {product.categories && (
          <span className="text-sm font-medium text-ink-400">{product.categories.name}</span>
        )}
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-700 leading-tight">{product.name}</h1>

        <div className="mt-4 flex items-baseline gap-3">
          <span className="text-2xl font-700">{formatPrice(unit)}</span>
          {Number(product.discount_percent) > 0 && (
            <>
              <span className="text-lg text-ink/35 line-through">{formatPrice(product.price)}</span>
              <span className="rounded-full bg-beak px-2.5 py-1 text-sm font-bold text-ink">
                -{product.discount_percent}%
              </span>
            </>
          )}
        </div>

        {product.description && (
          <p className="mt-4 whitespace-pre-line leading-relaxed text-ink-400">{product.description}</p>
        )}

        {/* Бараа бүгд дууссан үед */}
        {allOut && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="font-display font-700 text-red-700">📦 Энэ бараа одоогоор бэлэн байхгүй</p>
            <p className="text-sm text-red-600 mt-1">Удахгүй ачаа орох тул чатаар асууж лавлаарай.</p>
          </div>
        )}

        <div className="mt-6 space-y-6 border-t border-ink/10 pt-6">
          {/* ӨНГӨ */}
          {colors.length > 0 && (
            <div>
              <p className="mb-3 text-sm font-semibold">
                Өнгө сонгох {color && <span className="font-normal text-ink-400">— {color}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => pickColor(c)}
                    className={`h-10 min-w-[60px] rounded-full px-4 text-sm font-medium border-2 transition ${
                      color === c ? "border-ink bg-ink text-cream" : "border-ink/15 bg-paper hover:border-ink/40"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ХЭМЖЭЭ */}
          {sizes.length > 0 && (
            <div>
              <p className="mb-3 text-sm font-semibold">Хэмжээ сонгох</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {sizes.map((s) => {
                  const sizeStock = getStock(s, color);
                  const outOfStock = sizeStock < 1;
                  return (
                    <button
                      key={s}
                      onClick={() => { if (!outOfStock) { setSize(s); setMsg(""); setQty(1); } }}
                      disabled={outOfStock}
                      className={`rounded-lg border-2 py-3 text-sm font-medium transition ${
                        size === s
                          ? "border-ink bg-ink text-cream"
                          : outOfStock
                            ? "border-ink/5 text-ink/25 line-through cursor-not-allowed bg-cream"
                            : "border-ink/15 bg-paper hover:border-ink/40"
                      }`}
                    >
                      {s}
                      {!outOfStock && sizeStock <= 3 && (
                        <span className="ml-1 text-xs text-beak-600">({sizeStock} үлдсэн)</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ТОО */}
          {!allOut && (
            <div className="flex items-center gap-4">
              <p className="text-sm font-semibold">Тоо:</p>
              <div className="flex items-center rounded-lg border border-ink/15 overflow-hidden">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-4 py-2.5 text-lg hover:bg-cream transition">−</button>
                <span className="w-10 text-center font-semibold">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(q + 1, stock > 0 ? stock : 99))} className="px-4 py-2.5 text-lg hover:bg-cream transition">+</button>
              </div>
              {(size || color) && stock > 0 && stock <= 3 && (
                <span className="text-sm text-beak-600 font-semibold">Үлдэгдэл: {stock}</span>
              )}
            </div>
          )}

          {/* ТОВЧНУУД */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleAdd}
              disabled={allOut}
              className="w-full rounded-full bg-ink py-4 text-base font-semibold text-cream transition hover:bg-ink-600 active:scale-[.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {allOut ? "📦 Дууссан" : `Сагсанд нэмэх — ${formatPrice(unit * qty)}`}
            </button>
            {!allOut && (
              <button
                onClick={() => { handleAdd(); if (!needsSize && !needsColor && stock >= qty) router.push("/checkout"); }}
                className="w-full rounded-full border-2 border-ink/15 bg-paper py-4 text-base font-semibold transition hover:border-ink/40 active:scale-[.98]"
              >
                Шууд авах
              </button>
            )}
          </div>

          {msg && (
            <p className={`text-sm font-medium ${msg.includes("✓") ? "text-green-600" : "text-beak-600"}`}>{msg}</p>
          )}
        </div>
      </div>
    </div>
  );
}
