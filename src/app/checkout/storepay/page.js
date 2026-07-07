"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

function StorePayInner() {
  const router = useRouter();
  const cartContext = useCart();
  const cart = cartContext?.cart || [];
  const clearCart = cartContext?.clearCart || (() => {});

  const [step, setStep] = useState("form");
  const [mobileNumber, setMobileNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [instagram, setInstagram] = useState("");
  
  const [orderCode, setOrderCode] = useState("");
  const [loanId, setLoanId] = useState("");
  const [error, setError] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const itemsTotal = (cart || []).reduce((s, it) => s + Number(it.unitPrice || 0) * Number(it.qty || 0), 0);
  const deliveryFee = 7000;
  const totalAmount = itemsTotal + deliveryFee;

  if (!mounted) return <div className="p-4 text-ink-400">Ачаалж байна...</div>;

  async function createOrder() {
    setError("");
    if (!/^\d{8}$/.test(mobileNumber.replace(/\D/g, ""))) {
      setError("Утасны дугаар 8 оронтой байх ёстой");
      return;
    }
    if (!customerName || !address) {
      setError("Нэр, хаяг заавал");
      return;
    }
    if (cart.length === 0) {
      setError("Сагс хоосон байна");
      return;
    }

    try {
      const res = await fetch("/api/storepay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(it => ({
            productId: it.productId,
            productName: it.productName,
            size: it.size,
            color: it.color,
            qty: it.qty,
            unitPrice: it.unitPrice,
          })),
          customerName, phone: mobileNumber, address, note, instagram,
          mobileNumber: mobileNumber.replace(/\D/g, ""),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Алдаа гарлаа");
        return;
      }
      setOrderCode(data.order_code);
      setLoanId(data.loanId);
      setStep("waiting");
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (step !== "waiting" || !orderCode) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/storepay/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_code: orderCode }),
        });
        const data = await res.json();
        setPollCount(c => c + 1);
        if (data.paid) {
          clearInterval(interval);
          setStep("success");
          clearCart();
          setTimeout(() => router.push(`/order/${orderCode}`), 2000);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [step, orderCode]);

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="font-display text-2xl font-700 mb-6">💳 StorePay-ээр төлөх</h1>

      {step === "form" && (
        <div className="card p-6 space-y-4">
          <div className="rounded-xl bg-cream/50 p-3 space-y-1">
            {cart.map((it, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{it.productName} × {it.qty}</span>
                <span>{formatPrice(it.unitPrice * it.qty)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2 border-t border-ink/10">
              <span>Хүргэлт</span>
              <span>{formatPrice(deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-display font-700 text-lg pt-2 border-t border-ink/10">
              <span>Нийт</span>
              <span className="text-beak-600">{formatPrice(totalAmount)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-ink-400 font-semibold">Утасны дугаар (StorePay-т бүртгэлтэй)</label>
              <input
                type="tel"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="88112233"
                className="input w-full !py-3"
              />
              <p className="text-[10px] text-ink-400 mt-1">StorePay app-т бүртгэлтэй утасны дугаар оруулна уу</p>
            </div>
            <div>
              <label className="text-xs text-ink-400 font-semibold">Нэр</label>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                className="input w-full !py-3" />
            </div>
            <div>
              <label className="text-xs text-ink-400 font-semibold">Хаяг</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)}
                className="input w-full !py-3" />
            </div>
            <div>
              <label className="text-xs text-ink-400 font-semibold">Instagram (сонголт)</label>
              <input value={instagram} onChange={(e) => setInstagram(e.target.value)}
                placeholder="@username" className="input w-full !py-3" />
            </div>
            <div>
              <label className="text-xs text-ink-400 font-semibold">Тэмдэглэл (сонголт)</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)}
                className="input w-full !py-3" rows={2} />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>}

          <button onClick={createOrder}
            className="w-full py-3 rounded-full bg-ink text-cream font-bold hover:opacity-90 transition">
            💳 StorePay-ээр {formatPrice(totalAmount)} төлөх
          </button>
        </div>
      )}

      {step === "waiting" && (
        <div className="card p-6 text-center space-y-4">
          <div className="text-6xl">📱</div>
          <h2 className="font-display font-700 text-xl">StorePay app-с зөвшөөрлийг хүлээж байна</h2>
          <div className="bg-cream/50 p-4 rounded-xl space-y-2 text-left text-sm">
            <p>📱 <b>Утсаа шалгана уу</b></p>
            <p>1. StorePay app нээ</p>
            <p>2. Ирсэн notification эсвэл "Хүлээж буй хүсэлт" харах</p>
            <p>3. <b>{formatPrice(totalAmount)}</b> хүсэлтийг зөвшөөр</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-ink-400 text-sm">
            <div className="animate-spin h-4 w-4 border-2 border-beak border-t-transparent rounded-full" />
            <span>Шалгаж байна... ({pollCount} удаа)</span>
          </div>
          <p className="text-xs text-ink-400">Захиалгын дугаар: <b>#{orderCode}</b></p>
          <button onClick={() => setStep("form")}
            className="text-xs text-ink-400 underline">
            Цуцлаад буцах
          </button>
        </div>
      )}

      {step === "success" && (
        <div className="card p-8 text-center space-y-4">
          <div className="text-6xl">✅</div>
          <h2 className="font-display font-700 text-2xl text-green-700">Амжилттай!</h2>
          <p className="text-ink-400">Захиалгын хуудас руу шилжиж байна...</p>
          <p className="text-sm">Захиалгын дугаар: <b>#{orderCode}</b></p>
        </div>
      )}
    </div>
  );
}

export default function StorePayCheckout() {
  return (
    <Suspense fallback={<div className="p-4">Ачаалж байна...</div>}>
      <StorePayInner />
    </Suspense>
  );
}
