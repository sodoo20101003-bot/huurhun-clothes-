"use client";
import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

const CartContext = createContext(null);
const STORAGE_KEY = "huurhun_cart_v3";

/**
 * Универсал урамшуулал тооцоо
 * 1. Bundle promo (2 өөр ангилалын хос: гутал+цүнх=180k)
 * 2. Product pair_price (нэг барааны 2 ширхэг: 2 авбал X)
 * 3. Category pair_price (нэг ангиллын 2 ширхэг)
 */
function computeCartTotal(items, bundlePromos = []) {
  if (!items?.length) return 0;

  // Cart-ыг ширхэг тус бүрд задлах
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

  // ЭХЛЭЭД — Bundle promos (2 өөр ангилалын хос)
  const activeBundles = (bundlePromos || []).filter(b => b.is_active !== false);
  
  let keepGoing = true;
  while (keepGoing) {
    keepGoing = false;
    for (const promo of activeBundles) {
      const item1 = units.find(u => 
        u.categoryId === promo.category1_id && !usedKeys.has(u._key)
      );
      if (!item1) continue;

      const item2 = units.find(u => 
        u.categoryId === promo.category2_id && !usedKeys.has(u._key)
      );
      if (!item2) continue;

      const normalTotal = item1.unitPrice + item2.unitPrice;
      const bundlePrice = Number(promo.bundle_price);

      // Bundle price ашигтай бол хэрэглэх
      if (bundlePrice < normalTotal) {
        usedKeys.add(item1._key);
        usedKeys.add(item2._key);
        total += bundlePrice;
        keepGoing = true;
      }
    }
  }

  // ДАРАА — Product болон Category pair_price (ашиглагдаагүй units)
  const remainingUnits = units.filter(u => !usedKeys.has(u._key));
  
  // Product ID-аар бүлэглэх
  const byProduct = {};
  const byCategory = {};
  
  for (const u of remainingUnits) {
    if (u.pairPrice > 0) {
      if (!byProduct[u.productId]) byProduct[u.productId] = { units: [], pairPrice: u.pairPrice };
      byProduct[u.productId].units.push(u);
    } else if (u.categoryPairPrice > 0 && u.categoryId) {
      if (!byCategory[u.categoryId]) byCategory[u.categoryId] = { units: [], pairPrice: u.categoryPairPrice };
      byCategory[u.categoryId].units.push(u);
    } else {
      total += u.unitPrice;
    }
  }

  // Product pair_price
  for (const pid of Object.keys(byProduct)) {
    const { units: pUnits, pairPrice } = byProduct[pid];
    const pairs = Math.floor(pUnits.length / 2);
    total += pairs * pairPrice;
    for (let i = pairs * 2; i < pUnits.length; i++) {
      total += pUnits[i].unitPrice;
    }
  }

  // Category pair_price
  for (const catId of Object.keys(byCategory)) {
    const { units: cUnits, pairPrice } = byCategory[catId];
    cUnits.sort((a, b) => b.unitPrice - a.unitPrice);
    const pairs = Math.floor(cUnits.length / 2);
    total += pairs * pairPrice;
    for (let i = pairs * 2; i < cUnits.length; i++) {
      total += cUnits[i].unitPrice;
    }
  }

  return total;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  const [bundlePromos, setBundlePromos] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
      localStorage.removeItem("huurhun_cart_v2");
    } catch {}
    setReady(true);
    
    // Bundle promos татах
    loadBundlePromos();
  }, []);

  async function loadBundlePromos() {
    try {
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

// Bundle logic-ыг гадуур ашиглах боломж (POS-т)
export { computeCartTotal };
