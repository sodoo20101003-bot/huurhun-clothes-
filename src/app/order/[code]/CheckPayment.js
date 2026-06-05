"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Төлбөрийг автоматаар (10 секунд тутамд) болон гарын товчоор шалгана
export default function CheckPayment({ code }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function check(silent = false) {
    if (!silent) setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/qpay/callback?code=${code}`);
      const data = await res.json();
      if (data.paid) {
        router.refresh();
      } else if (!silent) {
        setMsg("Төлбөр хараахан баталгаажаагүй байна. Төлсөн бол түр хүлээгээд дахин шалгана уу.");
      }
    } catch (_) {
      if (!silent) setMsg("Шалгахад алдаа гарлаа.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Авто шалгалт — 10 секунд тутамд
  useEffect(() => {
    const id = setInterval(() => check(true), 10000);
    return () => clearInterval(id);
  }, [code]);

  return (
    <div className="mt-6">
      <button onClick={() => check(false)} disabled={loading} className="btn-primary w-full">
        {loading ? "Шалгаж байна..." : "Төлбөр төлсөн — шалгах"}
      </button>
      <p className="mt-2 text-center text-xs text-ink-400">
        Бид төлбөрийг автоматаар шалгаж байна.
      </p>
      {msg && <p className="mt-2 text-center text-sm text-ink-400">{msg}</p>}
    </div>
  );
}
