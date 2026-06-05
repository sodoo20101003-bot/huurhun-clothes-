"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { cartTotal } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const CartContext = createContext(null);
const KEY = "mongol_shop_cart";

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  const [categoryPairs, setCategoryPairs] = useState({}); // { [categoryId]: pair_price }

  // Анх ачаалахад localStorage-аас сэргээх
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch (_) {}
    setReady(true);
  }, []);

  // Ангиллын pair_price-уудыг уншина
  useEffect(() => {
    const supabase = createClient();
    supabase.from("categories").select("id,pair_price").then(({ data }) => {
      const map = {};
      (data || []).forEach((c) => {
        if (c.pair_price) map[c.id] = Number(c.pair_price);
      });
      setCategoryPairs(map);
    });
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, ready]);

  function add(line) {
    setItems((prev) => {
      const i = prev.findIndex(
        (x) =>
          x.productId === line.productId &&
          x.size === line.size &&
          x.color === line.color
      );
      if (i >= 0) {
        const copy = [...prev];
        copy[i] = { ...copy[i], qty: copy[i].qty + line.qty };
        return copy;
      }
      return [...prev, line];
    });
  }

  function updateQty(idx, qty) {
    setItems((prev) =>
      prev.map((x, i) => (i === idx ? { ...x, qty: Math.max(1, qty) } : x))
    );
  }

  function remove(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function clear() {
    setItems([]);
  }

  const count = items.reduce((s, x) => s + x.qty, 0);
  const total = cartTotal(items, categoryPairs);
  const subtotal = items.reduce((s, x) => s + x.unitPrice * x.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, add, updateQty, remove, clear, count, total, subtotal, ready, categoryPairs }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
