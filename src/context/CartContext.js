"use client";
import { createContext, useContext, useEffect, useState, useMemo, useRef } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "huurhun_cart_v3";

/**
 * Cart total:
 *   1) Bundle promos (2 өөр ангилалын хос: Sneakers + UGG = 280k)
 *   2) Product pair_price (ижил барааг 2 ш)
 *   3) Category pair_price (нэг ангиллын аль ч 2 бараа)
 */
function computeCartTotal(items, bundlePromos = []) {
  if (!items?.length) return 0;

  // ширхэг тус бүрд задлах
  const units = [];
  for (const it of items) {
    const qty = Number(it.qty || 0);
    for (let i = 0; i < qty; i++) {
      units.push({
        productId: it.productId,
        categoryId: it.categoryId || null,
        unitPrice: Number(it.unitPrice || 0),
        pairPrice: Number(it.pairPrice || 0),
        categoryPairPrice: Number(it.categoryPairPrice || 0),
        _key: `${it.productId}-${it.size || ""}-${it.color || ""}-${i}`,
      });
    }
  }

  let total = 0;
  const usedKeys = new Set();

  // 1) BUNDLE (2 өөр ангилалын хос) эхлээд
  const activeBundles = (bundlePromos || []).filter((b) => b.is_active !== false);
  let keepGoing = true;
  while (keepGoing) {
    keepGoing = false;
    for (const promo of activeBundles) {
      const u1 = units.find((u) => u.categoryId === promo.category1_id && !usedKeys.has(u._key));
      if (!u1) continue;
      const u2 = units.find(
        (u) => u.categoryId === promo.category2_id && !usedKeys.has(u._key) && u._key !== u1._key
      );
      if (!u2) continue;
      const normal = u1.unitPrice + u2.unitPrice;
      const bp = Number(promo.bundle_price);
      if (bp < normal) {
        usedKeys.add(u1._key);
        usedKeys.add(u2._key);
        total += bp;
        keepGoing = true;
      }
    }
  }

  const remaining = units.filter((u) => !usedKeys.has(u._key));

  // 2) PRODUCT pair_price — зөвхөн ижил барааг 2 ширхэг авбал
  const byProduct = {};
  for (const u of remaining) {
    if (!byProduct[u.productId]) byProduct[u.productId] = [];
    byProduct[u.productId].push(u);
  }
  const leftovers = [];
  for (const pid of Object.keys(byProduct)) {
    const arr = byProduct[pid];
    const pairPrice = Number(arr[0].pairPrice || 0);
    if (pairPrice > 0 && arr.length >= 2) {
      const pairs = Math.floor(arr.length / 2);
      total += pairs * pairPrice;
      for (let i = pairs * 2; i < arr.length; i++) leftovers.push(arr[i]);
    } else {
      // 1 ширхэг эсвэл product pair байхгүй → ангиллын хос руу
      for (const u of arr) leftovers.push(u);
    }
  }

  // 3) CATEGORY pair_price — нэг ангиллын аль ч 2 бараа
  const byCategory = {};
  const noCat = [];
  for (const u of leftovers) {
    if (u.categoryPairPrice > 0 && u.categoryId) {
      if (!byCategory[u.categoryId]) byCategory[u.categoryId] = { units: [], pairPrice: u.categoryPairPrice };
      byCategory[u.categoryId].units.push(u);
    } else {
      noCat.push(u);
    }
  }
  for (const catId of Object.keys(byCategory)) {
    const { units: cu, pairPrice } = byCategory[catId];
    cu.sort((a, b) => b.unitPrice - a.unitPrice);
    const pairs = Math.floor(cu.length / 2);
    total += pairs * pairPrice;
    for (let i = pairs * 2; i < cu.length; i++) total += cu[i].unitPrice;
  }
  for (const u of noCat) total += u.unitPrice;

  return total;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  const [bundlePromos, setBundlePromos] = useState([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
      localStorage.removeItem("huurhun_cart_v2");
    } catch {}
    setReady(true);

    loadBundlePromos();
  }, []);

  async function loadBundlePromos() {
    try {
      const mod = await import("@/lib/supabase/client");
      const supabase = mod.createClient();
      const { data } = await supabase
        .from("bundle_promos")
        .select("id,name,category1_id,category2_id,bundle_price,is_active")
        .eq("is_active", true);
      setBundlePromos(data || []);
    } catch (e) {
      console.warn("Bundle promos load error:", e);
    }
  }

  useEffect(() => {
    if (ready) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
    }
  }, [items, ready]);

  function add(item) {
    setItems((prev) => {
      const idx = prev.findIndex(
        (x) => x.productId === item.productId && x.size === item.size && x.color === item.color
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + (item.qty || 1) };
        return next;
      }
      return [...prev, { ...item, qty: item.qty || 1 }];
    });
  }

  function updateQty(idx, qty) {
    setItems((prev) => {
      if (qty < 1) return prev.filter((_, i) => i !== idx);
      const next = [...prev];
      next[idx] = { ...next[idx], qty };
      return next;
    });
  }

  function remove(idx) { setItems((prev) => prev.filter((_, i) => i !== idx)); }
  function clear() { setItems([]); }

  const subtotal = useMemo(() => items.reduce((s, x) => s + Number(x.unitPrice) * Number(x.qty), 0), [items]);
  const total = useMemo(() => computeCartTotal(items, bundlePromos), [items, bundlePromos]);
  const savings = subtotal - total;
  const count = useMemo(() => items.reduce((s, x) => s + Number(x.qty), 0), [items]);

  return (
    <CartContext.Provider value={{
      items, add, updateQty, remove, clear,
      subtotal, total, savings, count, ready,
      bundlePromos,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export function lineTotal(item) {
  return computeCartTotal([item]);
}

export { computeCartTotal };
