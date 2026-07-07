"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

function StorePayInner() {
  const router = useRouter();
  const cartContext = useCart();
  const clearCart = cartContext?.clear || (() => {});

  const [mounted, setMounted] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);
  const [step, setStep] = useState("confirm"); // confirm | waiting | success | error
  const [orderCode, setOrderCode] = useState("");
  const [loanId, setLoanId] = useState("");
  const [error, setError] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = sessionStorage.getItem("storepay_checkout_data");
      if (stored) {
        setCheckoutData(JSON.parse(stored));
      } else {
        // Ямар нэг мэдээлэл байхгүй бол checkout руу буцаах
        router.push("/checkout");
      }
    } catch (e) {
      router.push("/checkout");
    }
  }, []);

  const itemsTotal = (checkoutData?.items || []).reduce(
    (s, it) => s + Number(it.unitPrice || 0) * Number(it.qty || 0), 0
  );
  const deliveryFee = 7000;
  const totalAmount = itemsTotal + deliveryFee;

  async function createOrder() {
    setError("");
    setProcessing(true);
    try {
      const res = await fetch("/api/storepay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: checkoutData.items,
          customerName: checkoutData.customerName,
          phone: checkoutData.phone,
          address: checkoutData.address,
          note: checkoutData.note,
          mobileNumber: checkoutData.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Алдаа гарлаа");
        setProcessing(false);
        return;
      }
      setOrderCode(data.order_code);
      setLoanId(data.loanId);
      setStep("waiting");
      // Cart цэвэрлэх
      try {
        clearCart();
        sessionStorage.removeItem("storepay_checkout_data");
      } catch {}
    } catch (e) {
      setError(e.message);
      setProcessing(false);
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
          setTimeout(() => router.push(`/order/${orderCode}`), 2000);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [step, orderCode]);

  if (!mounted) return <div className="p-4 text-ink-400">Ачаалж байна...</div>;
  if (!checkoutData) return <div className="p-4 text-ink-400">Захиалгын мэдээлэл алга. Checkout руу буцаж байна...</div>;

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="font-display text-2xl font-700 mb-6">⭐ StorePay-ээр төлөх</h1>

      {step === "confirm" && (
        <div className="card p-6 space-y-4">
          <div className="rounded-xl bg-purple-50 border border-purple-200 p-4 space-y-2">
            <p className="text-sm font-bold text-purple-700">📱 Дараах утсанд хүсэлт илгээгдэнэ:</p>
            <p className="font-display text-2xl font-700">+976 {checkoutData.phone}</p>
            <p className="text-xs text-purple-600">Уг утасны дугаар StorePay app-т бүртгэлтэй байх ёстой</p>
          </div>

          <div className="rounded-xl bg-cream/50 p-4 space-y-1">
            <p className="text-xs font-bold text-ink-400 uppercase mb-2">Захиалгын дэлгэрэнгүй</p>
            {(checkoutData.items || []).map((it, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>
                  {it.productName} × {it.qty}
                  {it.size ? ` · ${it.size}` : ""}
                  {it.color ? ` · ${it.color}` : ""}
                </span>
                <span>{formatPrice(it.unitPrice * it.qty)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2 border-t border-ink/10">
              <span>Хүргэлт</span>
              <span>{formatPrice(deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-display font-700 text-lg pt-2 border-t border-ink/10">
              <span>Нийт</span>
              <span className="text-purple-700">{formatPrice(totalAmount)}</span>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

          <div className="flex gap-2">
            <button onClick={() => router.push("/checkout")}
              className="flex-1 py-3 rounded-full border-2 border-ink/15 font-bold hover:border-ink/30 transition">
              ← Буцах
            </button>
            <button onClick={createOrder} disabled={processing}
              className="flex-[2] py-3 rounded-full bg-purple-600 text-white font-bold hover:bg-purple-700 transition disabled:opacity-50">
              {processing ? "Илгээж байна..." : `⭐ ${formatPrice(totalAmount)} төлөх`}
            </button>
          </div>
        </div>
      )}

      {step === "waiting" && (
        <div className="card p-6 text-center space-y-4">
          <div className="text-6xl">📱</div>
          <h2 className="font-display font-700 text-xl">StorePay app-с зөвшөөрлийг хүлээж байна</h2>
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl space-y-2 text-left text-sm">
            <p className="font-bold text-purple-700">📱 Утсаа шалгана уу:</p>
            <p>1. <b>StorePay app</b> нээх</p>
            <p>2. Ирсэн notification эсвэл <b>"Хүлээж буй хүсэлт"</b> харах</p>
            <p>3. <b>{formatPrice(totalAmount)}</b> хүсэлтийг зөвшөөрөх</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-ink-400 text-sm">
            <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full" />
            <span>Автомат шалгаж байна... ({pollCount})</span>
          </div>
          <p className="text-xs text-ink-400">Захиалгын дугаар: <b>#{orderCode}</b></p>
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
