"use client";
import Link from "next/link";
import { formatPrice, finalPrice, firstImageUrl } from "@/lib/utils";
import { useFavorites } from "@/context/FavoritesContext";

export default function ProductCard({ product }) {
  const img = firstImageUrl(product.images);
  const hasDiscount = Number(product.discount_percent) > 0;
  const fp = finalPrice(product.price, product.discount_percent);
  const fav = useFavorites();
  const isFav = fav?.isFavorite(product.id) ?? false;

  function handleHeart(e) {
    e.preventDefault();
    e.stopPropagation();
    fav?.toggle(product.id);
  }

  return (
    <Link href={`/product/${product.id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-cream">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={product.name} className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]" />
        ) : (
          <div className="grid h-full w-full place-items-center text-ink/20 dot-grid text-sm">Зураггүй</div>
        )}

        {hasDiscount && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-cream">
            −{product.discount_percent}%
          </span>
        )}
        {Number(product.pair_price) > 0 && (
          <span className="absolute left-2.5 bottom-2.5 rounded-full bg-paper/95 px-2 py-0.5 text-[11px] font-semibold text-ink">
            2 авбал
          </span>
        )}
        {product.gift_note && !Number(product.pair_price) && (
          <span className="absolute left-2.5 bottom-2.5 grid h-6 w-6 place-items-center rounded-full bg-paper/95 text-xs">🎁</span>
        )}

        {/* ❤️ Дуртай товч */}
        <button
          onClick={handleHeart}
          className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-paper/90 backdrop-blur text-sm shadow-sm transition hover:scale-110"
          aria-label="Дуртай нэмэх"
        >
          {isFav ? "❤️" : "🤍"}
        </button>
      </div>

      <div className="pt-3">
        <h3 className="line-clamp-1 text-sm text-ink/90">{product.name}</h3>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-600 tracking-tight">{formatPrice(fp)}</span>
          {hasDiscount && (
            <span className="text-xs text-ink/35 line-through">{formatPrice(product.price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
