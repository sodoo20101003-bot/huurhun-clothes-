"use client";
import { createContext, useContext, useEffect, useState, useMemo } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "huurhun_cart_v3";

// Хосоор тооцоо: product-level pair_price + category-level pair_price
function computeCartTotal(items) {
  let total = 0;
  const byCategory = {};

  for (const it of items) {
    const qty = Number(it.qty || 0);
    const unit = Number(it.unitPrice || 0);
    const productPair = Number(it.pairPrice || 0);
    const categoryPair = Number(it.categoryPairPrice || 0);
    const catId = it.categoryId || null;

    // 1. Барааны өөрийн pair_price
    if (productPair > 0 && qty >= 2) {
      const pairs = Math.floor(qty / 2);
      const rest = qty % 2;
      total += pairs * productPair;
      if (rest > 0) {
        if (categoryPair > 0 && catId) {
          if (!byCategory[catId]) byCategory[catId] = { units: [], pairPrice: categoryPair };
          byCategory[catId].units.push(unit);
        } else total += rest * unit;
      }
      continue;
    }

    // 2. Категорийн pair_price
    if (categoryPair > 0 && catId) {
      if (!byCategory[catId]) byCategory[catId] = { units: [], pairPrice: categoryPair };
      for (let i = 0; i < qty; i++) byCategory[catId].units.push(unit);
      continue;
    }

    // 3. Энгийн
    total += qty * unit;
  }

  for (const catId of Object.keys(byCategory)) {
    const { units, pairPrice } = byCategory[catId];
    units.sort((a, b) => b - a);
    const pairs = Math.floor(units.length / 2);
    total += pairs * pairPrice;
    for (let i = pairs * 2; i < units.length; i++) total += units[i];
  }

  return total;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
      localStorage.removeItem("huurhun_cart_v2");
    } catch {}
    setReady(true);
  }, []);

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
  const total = useMemo(() => computeCartTotal(items), [items]);
  const savings = subtotal - total;
  const count = useMemo(() => items.reduce((s, x) => s + Number(x.qty), 0), [items]);

  return (
    <CartContext.Provider value={{ items, add, updateQty, remove, clear, subtotal, total, savings, count, ready }}>
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
