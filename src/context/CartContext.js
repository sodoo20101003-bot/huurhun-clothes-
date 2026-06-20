"use client";
import { createContext, useContext, useEffect, useState, useMemo } from "react";

const CartContext = createContext(null);

const STORAGE_KEY = "huurhun_cart_v2";

// === Pair price тооцоо ===
// Бараа бүрд pair_price байгаа бол, тухайн бараа 2+ ширхэг авбал автомат хямдрана
function computeLineTotal(item) {
  const qty = Number(item.qty || 0);
  const unit = Number(item.unitPrice || 0);
  const pair = Number(item.pairPrice || 0);
  if (pair > 0 && qty >= 2) {
    const pairs = Math.floor(qty / 2);
    const rest = qty % 2;
    return pairs * pair + rest * unit;
  }
  return qty * unit;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
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
      // Ижил productId + size + color байвал qty нэмнэ
      const idx = prev.findIndex(
        (x) =>
          x.productId === item.productId &&
          x.size === item.size &&
          x.color === item.color
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

  function remove(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function clear() {
    setItems([]);
  }

  const subtotal = useMemo(
    () => items.reduce((s, x) => s + Number(x.unitPrice) * Number(x.qty), 0),
    [items]
  );

  const total = useMemo(
    () => items.reduce((s, x) => s + computeLineTotal(x), 0),
    [items]
  );

  const savings = subtotal - total;

  const count = useMemo(
    () => items.reduce((s, x) => s + Number(x.qty), 0),
    [items]
  );

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

// Барааны нэг мөрийн дүнг тооцох (cart page харах зориулалтаар)
export function lineTotal(item) {
  return computeLineTotal(item);
}
