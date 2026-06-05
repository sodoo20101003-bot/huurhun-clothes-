// Үнийг ₮ форматаар харуулах
export function formatPrice(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("mn-MN").format(Math.round(n)) + "₮";
}

// Хямдралтай эцсийн үнэ
export function finalPrice(price, discountPercent) {
  const d = Number(discountPercent || 0);
  return Math.round(Number(price) * (1 - d / 100));
}

// Сагсны нийт дүн.
// 2 төрлийн урамшуулал:
// 1) Бараа бүр дээрх pair_price (хоёр ижил бараа)
// 2) Ангилал дээрх category_pair_price (тухайн ангиллын ямар ч хоёр ширхэг)
//
// Дараах дарааллаар тооцно:
//   - Эхлээд бараа тус бүрийн line-уудыг ширхэг тус бүрээр салгана
//   - Ангилал бүрт: тухайн ангилалд pair_price байвал тэр ангилал доторх
//     ширхэгүүдийг хосоор бүлэглэж, хосын үнэ + үлдсэнийг үндсэн үнээр
//   - Үгүй бол ширхэг бүрийг item.unitPrice-ээр (эсвэл item.pair_price-аар)
export function cartTotal(items, categoryPairs = {}) {
  // [{unit, categoryId, pair_price_self}] хэлбэрт салгана
  const units = [];
  for (const it of items || []) {
    for (let i = 0; i < Number(it.qty || 0); i++) {
      units.push({
        unit: Number(it.unitPrice || 0),
        categoryId: it.categoryId || null,
        pairSelf: Number(it.pair_price || 0),
      });
    }
  }

  // Ангилал бүрээр бүлэглэх
  const byCat = {};
  const standalone = [];
  for (const u of units) {
    const catPair = u.categoryId && categoryPairs[u.categoryId];
    if (catPair && catPair > 0) {
      if (!byCat[u.categoryId]) byCat[u.categoryId] = { pair: catPair, list: [] };
      byCat[u.categoryId].list.push(u);
    } else {
      standalone.push(u);
    }
  }

  let total = 0;

  // Ангилал бүрийн доторх pair-уудыг хосоор тооцно (хамгийн үнэтэйг хосолгож хямдрал хүчтэй болгох)
  for (const cid of Object.keys(byCat)) {
    const { pair, list } = byCat[cid];
    // Үнээр буурахаар эрэмбэлж 2-уулаар нь авна — хамгийн их хэмнэлт
    const sorted = [...list].sort((a, b) => b.unit - a.unit);
    let i = 0;
    while (i + 1 < sorted.length) {
      total += pair;
      i += 2;
    }
    if (i < sorted.length) total += sorted[i].unit; // үлдсэн нэг
  }

  // Стандарт line-ууд (хосын урамшуулалгүй) — бараа бүрийн өөрийнх нь pair_price-ийг ашиглаж болно
  // (бараа дотроо хос үнэтэй бол)
  // Эхлээд ижил бараагаар бүлэглэнэ
  const byProduct = {};
  for (const u of standalone) {
    const key = `${u.unit}|${u.pairSelf}`;
    if (!byProduct[key]) byProduct[key] = { unit: u.unit, pairSelf: u.pairSelf, qty: 0 };
    byProduct[key].qty += 1;
  }
  for (const k of Object.keys(byProduct)) {
    const { unit, pairSelf, qty } = byProduct[k];
    if (pairSelf > 0 && qty >= 2) {
      const pairs = Math.floor(qty / 2);
      const singles = qty % 2;
      total += pairs * pairSelf + singles * unit;
    } else {
      total += qty * unit;
    }
  }

  return total;
}

// Хадгалсан хоцрогдол: ганц line-ийн үнэ (cart-н харагдац)
export function lineTotalWithPromo(item) {
  const qty = Number(item.qty || 0);
  const unit = Number(item.unitPrice || 0);
  const pair = Number(item.pair_price || 0);
  if (pair > 0 && qty >= 2) {
    const pairs = Math.floor(qty / 2);
    const singles = qty % 2;
    return pairs * pair + singles * unit;
  }
  return qty * unit;
}

// Хэдэн хугацааны өмнө (нарийвчлалтай: хоног, цаг, минут)
// Жишээ: "1 хоног 5 цагийн өмнө", "3 цаг 12 минутын өмнө", "5 минутын өмнө"
export function timeAgo(dateInput) {
  const date = new Date(dateInput);
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "одоо";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "саяхан";

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} минутын өмнө`;

  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  if (hr < 24) {
    return remMin > 0 ? `${hr} цаг ${remMin} минутын өмнө` : `${hr} цагийн өмнө`;
  }

  const day = Math.floor(hr / 24);
  const remHr = hr % 24;
  return remHr > 0 ? `${day} хоног ${remHr} цагийн өмнө` : `${day} хоногийн өмнө`;
}

// Хүргэлтийн төлбөр
export const DELIVERY_FEE = 7000;

// 6 оронтой санамсаргүй захиалгын код (хэрэглэгчид өгөх код)
export function generateOrderCode() {
  let code = "";
  for (let i = 0; i < 6; i++) code += Math.floor(Math.random() * 10);
  return code;
}

export const ORDER_STATUS = {
  pending: "Хүлээгдэж буй",
  paid: "Төлбөр төлсөн",
  shipped: "Хүргэгдэж буй",
  done: "Дууссан",
  cancelled: "Цуцалсан",
};

// Зургийг нэг хэлбэрт оруулах: [{url, color}]
// Хуучин формат (зүгээр string массив) болон шинэ форматыг хоёуланг дэмжинэ.
export function normalizeImages(images) {
  if (!Array.isArray(images)) return [];
  return images.map((img) =>
    typeof img === "string" ? { url: img, color: null } : { url: img.url, color: img.color || null }
  );
}

// Эхний зургийн URL (ProductCard-д)
export function firstImageUrl(images) {
  const norm = normalizeImages(images);
  return norm[0]?.url || null;
}

// Сонгосон өнгөөр зургийг шүүх. Өнгөгүй (бүх өнгөнд хамаарах) зургийг үргэлж оруулна.
export function imagesForColor(images, color) {
  const norm = normalizeImages(images);
  if (!color) return norm;
  const matching = norm.filter((i) => i.color === color || !i.color);
  return matching.length ? matching : norm;
}
