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
    <Link
      href={`/product/${product.id}`}
      className="group card overflow-hidden transition hover:-translate-y-1 hover:shadow-soft relative"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-cream">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center text-ink/20 dot-grid">Зураггүй</div>
        )}
        {hasDiscount && (
          <span className="absolute left-3 top-3 rounded-full bg-beak px-2.5 py-1 text-xs font-bold text-ink shadow">
            -{product.discount_percent}%
          </span>
        )}
        {Number(product.pair_price) > 0 && (
          <span className="absolute right-3 top-12 rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-cream shadow">
            2 авбал
          </span>
        )}
        {product.gift_note && !Number(product.pair_price) && (
          <span className="absolute right-3 top-12 grid h-7 w-7 place-items-center rounded-full bg-green-500 text-sm shadow">
            🎁
          </span>
        )}

        {/* ❤️ Дуртай товч */}
        <button
          onClick={handleHeart}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 backdrop-blur text-lg shadow hover:scale-110 transition"
          aria-label="Дуртай нэмэх"
        >
          {isFav ? "❤️" : "🤍"}
        </button>
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="line-clamp-1 font-semibold text-sm sm:text-base">{product.name}</h3>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className="font-display font-600">{formatPrice(fp)}</span>
          {hasDiscount && (
            <span className="text-sm text-ink/40 line-through">{formatPrice(product.price)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
