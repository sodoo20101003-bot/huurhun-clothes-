"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { finalPrice, formatPrice, imagesForColor, lineTotalWithPromo } from "@/lib/utils";

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

  // Сонгосон өнгөөр зургийг шүүх
  const shownImages = useMemo(
    () => imagesForColor(product.images, color),
    [product.images, color]
  );

  const getStock = (s, c) => {
    return variants
      .filter((v) => (!sizes.length || v.size === s) && (!colors.length || v.color === c))
      .reduce((sum, v) => sum + Number(v.stock || 0), 0);
  };

  const stock = getStock(size, color);
  const needsSize = sizes.length > 0 && !size;
  const needsColor = colors.length > 0 && !color;
  const unit = finalPrice(product.price, product.discount_percent);

  function pickColor(c) {
    setColor(c);
    setMsg("");
    setQty(1);
    setActiveImg(0); // өнгө солиход эхний зураг руу буцах
  }

  function handleAdd() {
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
      pair_price: Number(product.pair_price) || 0,
      categoryId: product.category_id || null,
    });
    setMsg("Сагсанд нэмэгдлээ ✓");
  }

  const list = shownImages.length ? shownImages : [{ url: null }];

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
      {/* ===== ЗҮҮН ТАЛ — ЗУРАГ ===== */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row mx-auto w-full max-w-[480px] lg:max-w-none">
        {/* Thumbnails */}
        {list.length > 1 && (
          <div className="flex flex-row gap-2 sm:flex-col sm:w-[64px] sm:shrink-0 overflow-x-auto">
            {list.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`aspect-square w-14 sm:w-full shrink-0 overflow-hidden rounded-lg border-2 transition ${
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

        {/* Гол зураг */}
        <div className="flex-1 aspect-square overflow-hidden rounded-xl2 bg-cream max-h-[520px]">
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

        {/* Ангиллын багц үнэ (ямар ч 2 ширхэг — өөр өөр бараа байж болно) */}
        {product.categories?.pair_price > 0 && (
          <div className="mt-4 rounded-xl bg-beak-100 border border-beak/30 p-3 flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-beak font-display text-xs font-700 text-ink leading-tight text-center">
              2 авбал
            </span>
            <div>
              <p className="text-sm font-semibold">
                {product.categories.name}-ний ямар ч 2 ширхэг = {formatPrice(product.categories.pair_price)}
              </p>
              <p className="text-xs text-ink-400">
                Жишээ: 200,000₮ + 150,000₮-ын барааг хамт авбал {formatPrice(product.categories.pair_price)}.
                Сагсанд автоматаар тооцогдоно.
              </p>
            </div>
          </div>
        )}

        {/* Барааны өөрийнх нь pair_price (хэрэв ангилалд байхгүй) */}
        {!product.categories?.pair_price && Number(product.pair_price) > 0 && (
          <div className="mt-4 rounded-xl bg-beak-100 border border-beak/30 p-3 flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-beak font-display text-xs font-700 text-ink leading-tight text-center">
              2 авбал
            </span>
            <div>
              <p className="text-sm font-semibold">2 ширхэгийг {formatPrice(product.pair_price)}-аар!</p>
              <p className="text-xs text-ink-400">
                <b className="text-beak-600">Хэмнэлт: {formatPrice(unit * 2 - Number(product.pair_price))}</b>
              </p>
            </div>
          </div>
        )}

        {/* Бэлгийн тэмдэглэгээ */}
        {product.gift_note && (
          <div className="mt-3 rounded-xl bg-green-50 border border-green-300 p-3 flex items-center gap-3">
            <span className="text-2xl">🎁</span>
            <p className="text-sm font-semibold text-green-700">{product.gift_note}</p>
          </div>
        )}

        {product.description && (
          <p className="mt-4 whitespace-pre-line leading-relaxed text-ink-400">{product.description}</p>
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
          <div className="flex items-center gap-4">
            <p className="text-sm font-semibold">Тоо:</p>
            <div className="flex items-center rounded-lg border border-ink/15 overflow-hidden">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-4 py-2.5 text-lg hover:bg-cream transition">−</button>
              <span className="w-10 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(q + 1, stock > 0 ? stock : 99))} className="px-4 py-2.5 text-lg hover:bg-cream transition">+</button>
            </div>
            {(size || color) && stock > 0 && <span className="text-sm text-ink-400">Үлдэгдэл: {stock}</span>}
          </div>

          {/* ТОВЧНУУД */}
          <div className="space-y-3 pt-2">
            {(() => {
              const previewTotal = lineTotalWithPromo({ qty, unitPrice: unit, pair_price: Number(product.pair_price) || 0 });
              const savings = unit * qty - previewTotal;
              return (
                <button onClick={handleAdd} className="w-full rounded-full bg-ink py-4 text-base font-semibold text-cream transition hover:bg-ink-600 active:scale-[.98]">
                  <span>Сагсанд нэмэх — {formatPrice(previewTotal)}</span>
                  {savings > 0 && (
                    <span className="ml-2 text-xs font-bold text-beak">(-{formatPrice(savings)})</span>
                  )}
                </button>
              );
            })()}
            <button onClick={() => { handleAdd(); if (!needsSize && !needsColor && stock >= qty) router.push("/checkout"); }} className="w-full rounded-full border-2 border-ink/15 bg-paper py-4 text-base font-semibold transition hover:border-ink/40 active:scale-[.98]">
              Шууд авах
            </button>
          </div>

          {msg && (
            <p className={`text-sm font-medium ${msg.includes("✓") ? "text-green-600" : "text-beak-600"}`}>{msg}</p>
          )}
        </div>
      </div>
    </div>
  );
}
