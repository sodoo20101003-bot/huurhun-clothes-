/**
 * Универсал багц урамшуулал тооцоолол
 * POS, Web checkout, Manual order — бүх газарт хэрэглэнэ
 */

/**
 * Cart-т байгаа item-үүд болон идэвхтэй bundle_promos-с 
 * discount тооцно
 * 
 * @param {Array} cartItems - [{ productId, category_id, unitPrice, qty, ...}]
 * @param {Array} bundlePromos - [{ category1_id, category2_id, bundle_price, name, is_active }]
 * @returns {Object} { discount, appliedBundles, originalTotal, finalTotal }
 */
export function calcBundleDiscount(cartItems, bundlePromos) {
  if (!cartItems?.length || !bundlePromos?.length) {
    return { discount: 0, appliedBundles: [], originalTotal: 0, finalTotal: 0 };
  }

  // Cart-ыг ширхэг тус бүрд задлах (qty > 1 бол олон мөр)
  const units = [];
  for (const item of cartItems) {
    const qty = Number(item.qty || 1);
    for (let i = 0; i < qty; i++) {
      units.push({
        ...item,
        _unitId: `${item.productId || item.id}-${item.size || ""}-${item.color || ""}-${i}`,
      });
    }
  }

  const originalTotal = units.reduce((s, u) => s + Number(u.unitPrice || 0), 0);

  const activePromos = bundlePromos.filter(p => p.is_active !== false);
  if (!activePromos.length) {
    return { discount: 0, appliedBundles: [], originalTotal, finalTotal: originalTotal };
  }

  // Bundle тус бүрд яг тохирсон 2 ширхэг олж, discount тооцох
  let discount = 0;
  const appliedBundles = [];
  const usedIds = new Set();

  // Bundle-үүдийг олон удаа шалгах — 1 хосолж нэмэх боломжтой
  let keepGoing = true;
  while (keepGoing) {
    keepGoing = false;
    for (const promo of activePromos) {
      const item1 = units.find(u => 
        u.category_id === promo.category1_id && !usedIds.has(u._unitId)
      );
      if (!item1) continue;

      const item2 = units.find(u => 
        u.category_id === promo.category2_id && !usedIds.has(u._unitId)
      );
      if (!item2) continue;

      usedIds.add(item1._unitId);
      usedIds.add(item2._unitId);

      const normalTotal = Number(item1.unitPrice) + Number(item2.unitPrice);
      const bundlePrice = Number(promo.bundle_price);
      if (bundlePrice < normalTotal) {
        const saved = normalTotal - bundlePrice;
        discount += saved;
        appliedBundles.push({
          promoName: promo.name,
          bundlePrice,
          item1: { name: item1.productName || item1.name, price: item1.unitPrice },
          item2: { name: item2.productName || item2.name, price: item2.unitPrice },
          savedAmount: saved,
        });
        keepGoing = true; // Дахин шалгах
      }
    }
  }

  return {
    discount,
    appliedBundles,
    originalTotal,
    finalTotal: originalTotal - discount,
  };
}

/**
 * Bundle discount-ыг Supabase-с bundle_promos татаж дуудах
 */
export async function loadAndCalcBundles(supabase, cartItems) {
  if (!cartItems?.length) return { discount: 0, appliedBundles: [], originalTotal: 0, finalTotal: 0 };

  try {
    // Cart-т байгаа бараануудын category_id татах (хэрэв байхгүй бол)
    const productIds = cartItems
      .map(it => it.productId || it.id)
      .filter(Boolean);

    let enrichedItems = cartItems;
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("id, category_id")
        .in("id", productIds);
      
      const categoryMap = {};
      (products || []).forEach(p => { categoryMap[p.id] = p.category_id; });
      
      enrichedItems = cartItems.map(it => ({
        ...it,
        category_id: it.category_id || categoryMap[it.productId || it.id] || null,
      }));
    }

    // Идэвхтэй bundle_promos татах
    const { data: promos } = await supabase
      .from("bundle_promos")
      .select("*")
      .eq("is_active", true);

    return calcBundleDiscount(enrichedItems, promos || []);
  } catch (e) {
    console.error("Bundle calc error:", e);
    return { discount: 0, appliedBundles: [], originalTotal: 0, finalTotal: 0 };
  }
}
