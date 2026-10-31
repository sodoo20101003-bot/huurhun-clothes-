"use client";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, finalPrice, firstImageUrl } from "@/lib/utils";
import Link from "next/link";

const COMMON_SIZES = {
  "Гутал": ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
  "Хувцас": ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
};
const COMMON_COLORS = ["Хар", "Цагаан", "Саарал", "Хүрэн", "Хөх", "Улаан", "Ногоон", "Шар", "Ягаан"];

const emptyProduct = {
  name: "", price: "", discount_percent: 0, category_id: "", images: [],
  variants: [{ size: "", color: "", stock_branch1: "", stock_branch2: "" }],
};

function slugify(name) {
  const s = String(name || "").trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || `cat-${Date.now()}`;
}
function sortVariants(arr) {
  const SIZE_ORDER = { XS: 1, S: 2, M: 3, L: 4, XL: 5, "2XL": 6, "3XL": 7, "4XL": 8, "5XL": 9 };
  const sizeKey = (s) => {
    if (!s) return 0;
    const u = String(s).toUpperCase();
    if (SIZE_ORDER[u]) return SIZE_ORDER[u];
    const n = parseFloat(s);
    return isNaN(n) ? 1000 : n;
  };
  return [...arr].sort((a, b) => {
    const cA = a.color || "ZZZ", cB = b.color || "ZZZ";
    if (cA !== cB) return cA.localeCompare(cB, "mn");
    return sizeKey(a.size) - sizeKey(b.size);
  });
}

export default function KassaManage() {
  const supabase = createClient();

  // === Нууц үгийн хаалт ===
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState("");
  useEffect(() => {
    try { if (sessionStorage.getItem("kassa_ok") === "1") setUnlocked(true); } catch {}
  }, []);
  function tryUnlock() {
    if (pw === "huurhun2026") {
      setUnlocked(true);
      try { sessionStorage.setItem("kassa_ok", "1"); } catch {}
    } else alert("Нууц үг буруу");
  }

  const [tab, setTab] = useState("list");
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Шинэ бараа
  const [form, setForm] = useState(emptyProduct);
  const [busy, setBusy] = useState(false);
  const [sizeType, setSizeType] = useState("Гутал");

  // Шинэ ангилал
  const [newCat, setNewCat] = useState("");
  const [catBusy, setCatBusy] = useState(false);

  // === Ачаа нэмэх (BULK — admin шиг) ===
  const [rProduct, setRProduct] = useState(null); // сонгосон бараа
  const [rVariants, setRVariants] = useState([]);
  const [amounts, setAmounts] = useState({}); // { variantId: { s1, s2 } }
  const [rNote, setRNote] = useState("");
  const [rBusy, setRBusy] = useState(false);
  const [rMsg, setRMsg] = useState("");
  // Шинэ размер/өнгө нэмэх
  const [newVar, setNewVar] = useState({ size: "", color: "", s1: "", s2: "" });
  const [newVarBusy, setNewVarBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: c }, { data: p }, { data: v }] = await Promise.all([
      supabase.from("categories").select("id,name,slug").order("name"),
      supabase.from("products").select("id,name,price,discount_percent,category_id,images, categories(name)").order("created_at", { ascending: false }),
      supabase.from("product_variants").select("id,product_id,size,color,stock_branch1,stock_branch2"),
    ]);
    setCats(c || []);
    const byProd = {};
    for (const x of (v || [])) {
      if (!byProd[x.product_id]) byProd[x.product_id] = [];
      byProd[x.product_id].push(x);
    }
    setProducts((p || []).map((pr) => ({
      ...pr,
      _variants: sortVariants(byProd[pr.id] || []),
      _s1: (byProd[pr.id] || []).reduce((s, vv) => s + Number(vv.stock_branch1 || 0), 0),
      _s2: (byProd[pr.id] || []).reduce((s, vv) => s + Number(vv.stock_branch2 || 0), 0),
    })));
    setLoading(false);
  }
  useEffect(() => { if (unlocked) load(); }, [unlocked]);

  // === Шинэ бараа ===
  function setV(i, k, val) {
    setForm((f) => {
      const variants = [...f.variants];
      variants[i] = { ...variants[i], [k]: val };
      return { ...f, variants };
    });
  }
  const addRow = () => setForm((f) => ({ ...f, variants: [...f.variants, { size: "", color: "", stock_branch1: "", stock_branch2: "" }] }));
  const rmRow = (i) => setForm((f) => ({ ...f, variants: f.variants.filter((_, x) => x !== i) }));
  function quickSize(s) {
    if (form.variants.some((v) => v.size === s)) return;
    const empty = form.variants.length === 1 && !form.variants[0].size && !form.variants[0].color;
    if (empty) setV(0, "size", s);
    else setForm((f) => ({ ...f, variants: [...f.variants, { size: s, color: "", stock_branch1: "", stock_branch2: "" }] }));
  }
  async function uploadImgs(files) {
    const imgs = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/manage/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) { alert(data.error || "Зураг оруулахад алдаа"); continue; }
        imgs.push({ url: data.url, color: null });
      } catch (e) { alert(e.message); }
    }
    setForm((f) => ({ ...f, images: [...f.images, ...imgs] }));
  }
  async function saveProduct() {
    if (!form.name.trim() || !form.price) return alert("Нэр болон үнэ заавал");
    setBusy(true);
    try {
      const res = await fetch("/api/manage/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          price: Number(form.price),
          discount_percent: Number(form.discount_percent) || 0,
          category_id: form.category_id || null,
          images: form.images,
          variants: form.variants,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setBusy(false); return alert("Алдаа: " + (data.error || "")); }
    } catch (e) { setBusy(false); return alert("Алдаа: " + e.message); }
    setBusy(false);
    setForm(emptyProduct);
    alert("✅ Бараа нэмэгдлээ");
    setTab("list");
    await load();
  }

  async function addCategory() {
    if (!newCat.trim()) return alert("Ангиллын нэр оруулна уу");
    setCatBusy(true);
    try {
      const res = await fetch("/api/manage/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCat.trim(), slug: slugify(newCat) }),
      });
      const data = await res.json();
      if (!res.ok) { setCatBusy(false); return alert("Алдаа: " + (data.error || "")); }
    } catch (e) { setCatBusy(false); return alert("Алдаа: " + e.message); }
    setCatBusy(false);
    setNewCat("");
    alert("✅ Ангилал нэмэгдлээ");
    await load();
  }

  // === BULK АЧАА ===
  function openRestock(p) {
    setRProduct(p);
    setRVariants(p._variants || []);
    setAmounts({});
    setRNote("");
    setRMsg("");
    setNewVar({ size: "", color: "", s1: "", s2: "" });
  }
  async function addNewVariant() {
    if (!newVar.size && !newVar.color) return setRMsg("⚠️ Размер эсвэл өнгө оруулна уу");
    setNewVarBusy(true);
    try {
      const res = await fetch("/api/manage/variant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: rProduct.id,
          size: newVar.size || null,
          color: newVar.color || null,
          stock_branch1: newVar.s1,
          stock_branch2: newVar.s2,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setNewVarBusy(false); return setRMsg("⚠️ " + (data.error || "Алдаа")); }
      setRMsg("✅ Шинэ размер/өнгө нэмэгдлээ");
      setNewVar({ size: "", color: "", s1: "", s2: "" });
      await load();
    } catch (e) { setRMsg("⚠️ " + e.message); }
    setNewVarBusy(false);
  }
  function setAmt(vid, branch, val) {
    setAmounts((prev) => ({ ...prev, [vid]: { ...(prev[vid] || {}), [branch]: val } }));
  }
  async function submitAll() {
    const toDo = rVariants
      .map((v) => ({ v, s1: Number(amounts[v.id]?.s1 || 0), s2: Number(amounts[v.id]?.s2 || 0) }))
      .filter((x) => x.s1 > 0 || x.s2 > 0);
    if (toDo.length === 0) return setRMsg("⚠️ Хэдэн ширхэг нэмэхээ бөглөнө үү");
    setRBusy(true);
    let ok = 0, fail = 0;
    for (const item of toDo) {
      for (const [branch, qty] of [["branch1", item.s1], ["branch2", item.s2]]) {
        if (qty <= 0) continue;
        try {
          const res = await fetch("/api/restock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: rProduct.id, productName: rProduct.name,
              size: item.v.size || null, color: item.v.color || null,
              qty, branch, note: rNote || null,
            }),
          });
          if (res.ok) ok++; else fail++;
        } catch { fail++; }
      }
    }
    setRBusy(false);
    setRMsg(fail > 0 ? `⚠️ ${ok} амжилттай, ${fail} алдаатай` : `✅ ${ok} variant шинэчлэгдлээ!`);
    setAmounts({});
    await load();
    // шинэчилсэн үлдэгдлийг дахин авах
    const fresh = (products.find((x) => x.id === rProduct.id)) || rProduct;
    // load() дараа products шинэчлэгдэх тул rVariants-ийг дахин татна
  }
  // rProduct сонгогдсон үед products шинэчлэгдвэл rVariants-ийг дагуулж шинэчлэх
  useEffect(() => {
    if (!rProduct) return;
    const fresh = products.find((x) => x.id === rProduct.id);
    if (fresh) setRVariants(fresh._variants || []);
  }, [products]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  // === НУУЦ ҮГ ===
  if (!unlocked) {
    return (
      <div className="min-h-[70vh] grid place-items-center p-4">
        <div className="card p-6 w-full max-w-xs text-center space-y-4">
          <p className="font-display text-xl font-700">🔒 Бараа удирдлага</p>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") tryUnlock(); }}
            placeholder="Нууц үг" autoFocus
            className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2.5 text-center outline-none focus:border-beak" />
          <button onClick={tryUnlock} className="btn-accent w-full">Орох</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-xl font-700">📦 Бараа удирдлага</h1>
        <Link href="/kassa" className="text-sm text-ink-400 hover:text-ink">← Касс руу</Link>
      </div>

      {/* TAB */}
      {!rProduct && (
        <div className="flex gap-2">
          {[
            { v: "list", l: "📋 Бүх бараа" },
            { v: "add", l: "➕ Шинэ бараа" },
            { v: "cats", l: "🗂 Ангилал" },
          ].map((t) => (
            <button key={t.v} onClick={() => setTab(t.v)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === t.v ? "bg-ink text-cream" : "bg-cream border border-ink/15"}`}>{t.l}</button>
          ))}
        </div>
      )}

      {/* === BULK АЧАА (бараа сонгосон) === */}
      {rProduct ? (
        <div className="space-y-3">
          <div className="card p-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-cream">
                {firstImageUrl(rProduct.images) && <img src={firstImageUrl(rProduct.images)} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-ink-400">Сонгосон бараа</p>
                <h2 className="font-display text-lg font-700 truncate">{rProduct.name}</h2>
              </div>
            </div>
            <button onClick={() => setRProduct(null)} className="shrink-0 text-sm rounded-lg border border-ink/15 px-3 py-1.5">← Өөр бараа</button>
          </div>

          <input value={rNote} onChange={(e) => setRNote(e.target.value)} placeholder="Тэмдэглэл (заавал биш)"
            className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2.5 outline-none focus:border-beak" />

          <div className="card overflow-hidden">
            <div className="bg-ink text-cream p-3 grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-2 text-xs font-bold">
              <div>Variant</div>
              <div className="text-center">Одоогийн (С1/С2)</div>
              <div className="text-center">➕ Салбар 1</div>
              <div className="text-center">➕ Салбар 2</div>
            </div>
            <div className="divide-y divide-ink/5 max-h-[60vh] overflow-y-auto">
              {rVariants.length === 0 && <p className="text-center text-ink-400 p-6">Variant алга</p>}
              {rVariants.map((v) => (
                <div key={v.id} className="p-3 grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-2 items-center">
                  <div className="font-semibold text-sm">{v.size || "—"}{v.color && <span className="text-ink-400"> · {v.color}</span>}</div>
                  <div className="text-center text-sm">
                    <span className="text-green-700 font-bold">{v.stock_branch1 || 0}</span>
                    <span className="text-ink-400"> / </span>
                    <span className="text-beak-600 font-bold">{v.stock_branch2 || 0}</span>
                  </div>
                  <input type="number" min="0" value={amounts[v.id]?.s1 || ""} onChange={(e) => setAmt(v.id, "s1", e.target.value)} placeholder="0"
                    className="w-full rounded-md border border-ink/15 bg-paper px-2 py-2 text-center text-sm outline-none focus:border-beak" />
                  <input type="number" min="0" value={amounts[v.id]?.s2 || ""} onChange={(e) => setAmt(v.id, "s2", e.target.value)} placeholder="0"
                    className="w-full rounded-md border border-ink/15 bg-paper px-2 py-2 text-center text-sm outline-none focus:border-beak" />
                </div>
              ))}
            </div>
          </div>

          {/* ➕ Шинэ размер/өнгө нэмэх */}
          <div className="card p-3 space-y-2 border border-dashed border-beak/40">
            <p className="text-xs font-bold text-ink-400 uppercase tracking-wide">➕ Шинэ размер/өнгө нэмэх</p>
            <div className="grid grid-cols-[1fr_1fr_56px_56px] gap-2">
              <input value={newVar.size} onChange={(e) => setNewVar((n) => ({ ...n, size: e.target.value }))} placeholder="Размер"
                className="rounded-md border border-ink/15 bg-paper px-2 py-2 text-sm outline-none focus:border-beak" />
              <input value={newVar.color} onChange={(e) => setNewVar((n) => ({ ...n, color: e.target.value }))} placeholder="Өнгө"
                className="rounded-md border border-ink/15 bg-paper px-2 py-2 text-sm outline-none focus:border-beak" />
              <input type="number" min="0" value={newVar.s1} onChange={(e) => setNewVar((n) => ({ ...n, s1: e.target.value }))} placeholder="С1"
                className="rounded-md border border-ink/15 bg-paper px-1 py-2 text-center text-sm outline-none focus:border-beak" />
              <input type="number" min="0" value={newVar.s2} onChange={(e) => setNewVar((n) => ({ ...n, s2: e.target.value }))} placeholder="С2"
                className="rounded-md border border-ink/15 bg-paper px-1 py-2 text-center text-sm outline-none focus:border-beak" />
            </div>
            <button onClick={addNewVariant} disabled={newVarBusy}
              className="w-full rounded-lg border border-beak bg-beak-100/40 px-3 py-2 text-sm font-semibold text-beak-600 hover:bg-beak-100">
              {newVarBusy ? "Нэмж..." : "➕ Нэмэх"}
            </button>
          </div>

          {rMsg && <div className={`card p-3 text-center text-sm ${rMsg.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{rMsg}</div>}

          <button onClick={submitAll} disabled={rBusy} className="btn-accent w-full !py-4 text-lg">
            {rBusy ? "Нэмж байна..." : "💾 БҮГДИЙГ ХАДГАЛАХ"}
          </button>
        </div>
      ) : (
        <>
          {/* === БҮХ БАРАА === */}
          {tab === "list" && (
            <div className="space-y-3">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Бараа хайх..."
                className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2.5 outline-none focus:border-beak" />
              {loading ? <p className="text-ink-400 p-4 text-center">Ачаалж байна...</p> : (
                <div className="space-y-2">
                  {filtered.map((p) => (
                    <div key={p.id} className="card p-3 flex items-center gap-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-cream">
                        {firstImageUrl(p.images) && <img src={firstImageUrl(p.images)} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{p.name}</p>
                        <p className="text-xs text-ink-400">
                          {p.categories?.name || "—"} · {formatPrice(finalPrice(p.price, p.discount_percent))}
                          {" · "}<span className="font-semibold text-green-700">С1 {p._s1}</span> · <span className="font-semibold text-beak-600">С2 {p._s2}</span>
                        </p>
                      </div>
                      <button onClick={() => openRestock(p)}
                        className="shrink-0 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-100">📥 Ачаа</button>
                    </div>
                  ))}
                  {filtered.length === 0 && <p className="text-center text-ink-400 p-6">Бараа алга</p>}
                </div>
              )}
            </div>
          )}

          {/* === ШИНЭ БАРАА === */}
          {tab === "add" && (
            <div className="card p-4 space-y-4">
              <input className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2.5 outline-none focus:border-beak"
                placeholder="Барааны нэр" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <div className="grid gap-3 sm:grid-cols-3">
                <select className="rounded-lg border border-ink/15 bg-paper px-3 py-2.5 outline-none focus:border-beak"
                  value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">— Ангилал —</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="number" className="rounded-lg border border-ink/15 bg-paper px-3 py-2.5 outline-none focus:border-beak"
                  placeholder="Үнэ ₮" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                <input type="number" className="rounded-lg border border-ink/15 bg-paper px-3 py-2.5 outline-none focus:border-beak"
                  placeholder="Хямдрал %" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
              </div>

              <div className="rounded-xl bg-cream/50 p-3 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-ink-400">Түргэн:</span>
                  {Object.keys(COMMON_SIZES).map((t) => (
                    <button key={t} onClick={() => setSizeType(t)}
                      className={`text-xs rounded-full px-3 py-1 border ${sizeType === t ? "border-ink bg-ink text-cream" : "border-ink/15"}`}>{t}</button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_SIZES[sizeType].map((s) => (
                    <button key={s} onClick={() => quickSize(s)}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${form.variants.some((v) => v.size === s) ? "border-ink bg-ink text-cream" : "border-ink/15"}`}>{s}</button>
                  ))}
                </div>
                <div className="grid grid-cols-[1fr_1fr_60px_60px_32px] gap-2 text-xs font-semibold text-ink-400">
                  <span>Хэмжээ</span><span>Өнгө</span><span className="text-center">С1</span><span className="text-center">С2</span><span></span>
                </div>
                {form.variants.map((v, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_60px_60px_32px] gap-2">
                    <input className="rounded-lg border border-ink/15 bg-paper px-2 py-2 text-sm" placeholder="40" value={v.size} onChange={(e) => setV(i, "size", e.target.value)} />
                    <input className="rounded-lg border border-ink/15 bg-paper px-2 py-2 text-sm" placeholder="Хар" value={v.color} onChange={(e) => setV(i, "color", e.target.value)} list="mn-colors" />
                    <input type="number" className="rounded-lg border border-ink/15 bg-paper px-1 py-2 text-sm text-center" placeholder="0" value={v.stock_branch1} onChange={(e) => setV(i, "stock_branch1", e.target.value)} />
                    <input type="number" className="rounded-lg border border-ink/15 bg-paper px-1 py-2 text-sm text-center" placeholder="0" value={v.stock_branch2} onChange={(e) => setV(i, "stock_branch2", e.target.value)} />
                    <button onClick={() => rmRow(i)} className="text-red-400 hover:bg-red-50 rounded-lg">✕</button>
                  </div>
                ))}
                <datalist id="mn-colors">{COMMON_COLORS.map((c) => <option key={c} value={c} />)}</datalist>
                <button onClick={addRow} className="text-sm font-medium text-beak-600 hover:underline">+ мөр нэмэх</button>
              </div>

              <div className="flex flex-wrap gap-3">
                {form.images.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img.url} alt="" className="h-24 w-24 rounded-xl object-cover" />
                    <button onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, x) => x !== i) }))}
                      className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-xs text-white">×</button>
                  </div>
                ))}
                <label className="grid h-24 w-24 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-ink/20 text-ink/30 hover:border-beak">
                  <span className="text-center text-xs">+ Зураг</span>
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => uploadImgs([...e.target.files])} />
                </label>
              </div>

              <button onClick={saveProduct} disabled={busy} className="btn-accent w-full">{busy ? "Хадгалж..." : "💾 Бараа нэмэх"}</button>
            </div>
          )}

          {/* === АНГИЛАЛ === */}
          {tab === "cats" && (
            <div className="space-y-4">
              <div className="card p-4 flex gap-2">
                <input className="flex-1 rounded-lg border border-ink/15 bg-paper px-3 py-2.5 outline-none focus:border-beak"
                  placeholder="Шинэ ангиллын нэр" value={newCat} onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addCategory(); }} />
                <button onClick={addCategory} disabled={catBusy} className="btn-accent shrink-0">{catBusy ? "..." : "➕ Нэмэх"}</button>
              </div>
              <div className="card p-4">
                <p className="text-sm font-semibold mb-2">Одоогийн ангилал ({cats.length})</p>
                <div className="flex flex-wrap gap-2">
                  {cats.map((c) => (
                    <span key={c.id} className="rounded-full bg-cream border border-ink/10 px-3 py-1.5 text-sm">{c.name}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
