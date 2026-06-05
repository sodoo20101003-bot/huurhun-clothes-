"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, DELIVERY_FEE } from "@/lib/utils";

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();
  const { items, total, clear, ready } = useCart();
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [form, setForm] = useState({ email: "", phone: "", address: "", door_code: "", map_link: "", note: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Нэвтэрсэн хэрэглэгчийг шалгах
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user?.email) {
        setForm((f) => ({ ...f, email: user.email }));
      }
      setAuthReady(true);
    });
  }, []);

  if (!ready || !authReady) return null;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-ink-400">Сагс хоосон байна.</p>
      </div>
    );
  }

  const grandTotal = total + DELIVERY_FEE;

  // ===== НЭВТРЭЭГҮЙ БОЛ =====
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="card p-8 text-center">
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="font-display text-2xl font-700">Захиалга өгөхийн тулд нэвтэрнэ үү</h1>
          <p className="mt-2 text-sm text-ink-400">
            Захиалга өгөхийн тулд эхлээд имэйл эсвэл Google хаягаар нэвтэрсэн байх шаардлагатай.
            Энэ нь таны захиалгын мэдээллийг найдвартай хадгалах болон захиалгын кодыг таны имэйлд илгээх боломж олгоно.
          </p>
          <Link
            href="/login?redirect=/checkout"
            className="btn-accent mt-6 w-full inline-block"
          >
            Нэвтрэх / Бүртгүүлэх
          </Link>
        </div>
      </div>
    );
  }

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function validatePhone(p) {
    const digits = p.replace(/\D/g, "");
    return digits.length === 8;
  }

  function validateEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  async function submit() {
    setErr("");
    if (!validateEmail(form.email)) return setErr("Имэйл хаягаа зөв оруулна уу.");
    if (!validatePhone(form.phone)) return setErr("Монголын 8 оронтой утасны дугаар оруулна уу.");
    if (!form.address) return setErr("Хүргэлтийн хаягаа бөглөнө үү.");
    setLoading(true);
    try {
      const res = await fetch("/api/qpay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          total: grandTotal,
          customer: {
            name: form.email,
            phone: form.phone,
            address: form.address,
            note: [
              form.door_code && `Орцны код: ${form.door_code}`,
              form.map_link && `📍 Газрын зураг: ${form.map_link}`,
              form.note,
            ]
              .filter(Boolean)
              .join(" · "),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Алдаа гарлаа");
      clear();
      router.push(`/order/${data.code}`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl font-700">Захиалга өгөх</h1>
      <p className="mt-1 text-sm text-ink-400">
        Нэвтэрсэн: <b>{user.email}</b>
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* === ФОРМ === */}
        <div className="card p-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Имэйл *</label>
            <input
              className="input"
              type="email"
              placeholder="example@gmail.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              disabled
            />
            <p className="mt-1 text-xs text-ink-400">Нэвтэрсэн хаяг — захиалгын код энд илгээгдэнэ</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Утас *</label>
            <div className="flex">
              <span className="grid place-items-center rounded-l-xl border border-r-0 border-ink/10 bg-cream px-3 text-sm font-semibold">+976</span>
              <input
                className="input !rounded-l-none"
                placeholder="99112233"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 8))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Хүргэлтийн хаяг *</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Дүүрэг, хороо, гудамж, байр, тоот"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Орцны код (заавал биш)</label>
            <input
              className="input"
              value={form.door_code}
              onChange={(e) => set("door_code", e.target.value)}
              placeholder="ж: 1234"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">📍 Google Maps линк (заавал биш)</label>
            <input
              className="input"
              value={form.map_link}
              onChange={(e) => set("map_link", e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
            />
            <p className="mt-1 text-xs text-ink-400">
              Google Maps дээрээс байршлаа сонгоод "Share → Copy link" хийгээд энд тавь.
              Хүргэлтийн ажилтан байршлыг хурдан олно.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold">Тэмдэглэл (заавал биш)</label>
            <textarea
              className="input"
              rows={2}
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="ж: 19 цагаас хойш ирүүлээрэй"
            />
          </div>
          {err && <p className="text-sm text-red-500">{err}</p>}
        </div>

        {/* === НИЙЛБЭР === */}
        <div className="card p-6 h-fit lg:sticky lg:top-24">
          <h2 className="font-display font-600">Захиалгын дүн</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-400">Барааны үнэ</span>
              <span>{formatPrice(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-400">Хүргэлт</span>
              <span>{formatPrice(DELIVERY_FEE)}</span>
            </div>
            <div className="border-t border-ink/10 pt-2 flex justify-between font-display font-700 text-lg">
              <span>Нийт</span>
              <span>{formatPrice(grandTotal)}</span>
            </div>
          </div>
          <button onClick={submit} disabled={loading} className="btn-accent mt-6 w-full">
            {loading ? "Үүсгэж байна..." : "Захиалга баталгаажуулах"}
          </button>
          <p className="mt-3 text-xs text-ink-400 text-center">
            Дараа QPay-ээр төлбөрөө төлнө
          </p>
        </div>
      </div>
    </div>
  );
}
