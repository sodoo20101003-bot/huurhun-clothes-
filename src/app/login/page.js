"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Утасны дугаарыг синтетик имэйл болгон хувиргах
function normalizePhone(raw) {
  let p = String(raw || "").replace(/\D/g, "");
  if (p.startsWith("976")) p = p.slice(3);
  return p;
}
const phoneToEmail = (phone) => `${phone}@phone.huurhunclothes.com`;
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ""));

function LoginInner() {
  const params = useSearchParams();
  const next = params.get("next") || params.get("redirect") || "/profile";
  const errParam = params.get("err");
  const supabase = createClient();

  const [mode, setMode] = useState("login"); // login | signup
  const [method, setMethod] = useState("phone"); // phone | email
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function google() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  async function submit() {
    setMsg("");
    // Нэвтрэх имэйл (утас эсвэл жинхэнэ имэйл)
    let loginEmail;
    if (method === "phone") {
      const p = normalizePhone(phone);
      if (!/^\d{8}$/.test(p)) return setMsg("Утасны дугаараа зөв оруулна уу (8 оронтой).");
      loginEmail = phoneToEmail(p);
    } else {
      if (!isEmail(email)) return setMsg("Имэйл хаягаа зөв оруулна уу.");
      loginEmail = email.trim().toLowerCase();
    }
    if (password.length < 6) return setMsg("Нууц үг дор хаяж 6 тэмдэгт байх ёстой.");
    if (mode === "signup" && password !== password2) return setMsg("Нууц үг таарахгүй байна.");

    setBusy(true);
    try {
      if (mode === "signup") {
        const opts = method === "phone"
          ? { data: { phone: normalizePhone(phone), full_name: normalizePhone(phone) } }
          : {};
        const { data, error } = await supabase.auth.signUp({ email: loginEmail, password, options: opts });
        if (error) {
          setMsg(/already|registered|exists/i.test(error.message) ? "Энэ бүртгэлтэй байна. Нэвтрэх хэсгээр орно уу." : error.message);
          setBusy(false);
          return;
        }
        if (!data.session) {
          const { error: e2 } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
          if (e2) { setMsg("Бүртгэл үүслээ. Одоо нэвтэрнэ үү."); setMode("login"); setBusy(false); return; }
        }
        location.href = next;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
        if (error) { setMsg(method === "phone" ? "Дугаар эсвэл нууц үг буруу." : "Имэйл эсвэл нууц үг буруу."); setBusy(false); return; }
        location.href = next;
      }
    } catch (e) {
      setMsg(e.message || "Алдаа гарлаа.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="card p-7 sm:p-8">
        <h1 className="font-display text-2xl font-800 tracking-tight">{mode === "signup" ? "Бүртгүүлэх" : "Нэвтрэх"}</h1>
        <p className="mt-1 text-sm text-ink-400">Захиалгаа хянах, түүхээ үзэх, кассад нэвтрэхийн тулд.</p>

        {errParam && <div className="mt-4 rounded-xl bg-beak-100 border border-beak/30 p-3 text-sm text-ink">{errParam}</div>}

        {/* Нэвтрэх / Бүртгүүлэх */}
        <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-cream/70 p-1">
          {[["login", "Нэвтрэх"], ["signup", "Бүртгүүлэх"]].map(([v, l]) => (
            <button key={v} onClick={() => { setMode(v); setMsg(""); }}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${mode === v ? "bg-ink text-cream shadow-sm" : "text-ink-400 hover:text-ink"}`}>{l}</button>
          ))}
        </div>

        {/* Утас / Имэйл сонголт */}
        <div className="mt-4 flex gap-2">
          {[["phone", "📱 Утсаар"], ["email", "✉️ Имэйлээр"]].map(([v, l]) => (
            <button key={v} onClick={() => { setMethod(v); setMsg(""); }}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${method === v ? "border-ink bg-ink/[0.04] text-ink" : "border-ink/15 text-ink-400 hover:border-ink/30"}`}>{l}</button>
          ))}
        </div>

        {/* Талбарууд */}
        <div className="mt-4 space-y-3">
          {method === "phone" ? (
            <div className="flex items-center overflow-hidden rounded-2xl border border-ink/15 bg-paper focus-within:border-beak">
              <span className="border-r border-ink/10 px-3 py-3 text-sm text-ink-400">🇲🇳 +976</span>
              <input type="tel" inputMode="numeric" className="flex-1 bg-transparent px-3 py-3 outline-none"
                placeholder="99112233" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          ) : (
            <input type="email" className="input" placeholder="имэйл хаяг (gmail)"
              value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          )}

          <input type="password" className="input" placeholder="Нууц үг"
            value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && mode === "login") submit(); }} autoComplete="current-password" />

          {mode === "signup" && (
            <input type="password" className="input" placeholder="Нууц үг давтах"
              value={password2} onChange={(e) => setPassword2(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
          )}

          {msg && <p className="text-sm text-red-600">{msg}</p>}

          <button onClick={submit} disabled={busy} className="btn-primary w-full !py-3.5">
            {busy ? "Түр хүлээнэ үү..." : mode === "signup" ? "Бүртгүүлэх" : "Нэвтрэх"}
          </button>
        </div>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3 text-xs text-ink/30">
          <span className="h-px flex-1 bg-ink/10" /> эсвэл <span className="h-px flex-1 bg-ink/10" />
        </div>

        {/* Google */}
        <button onClick={google} className="btn-ghost w-full !py-3">
          <span className="font-bold text-base">G</span> Google-ээр нэвтрэх
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-ink-400">
        {mode === "login" ? "Шинэ хэрэглэгч үү? " : "Бүртгэлтэй юу? "}
        <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(""); }} className="font-semibold text-beak-600 hover:underline">
          {mode === "login" ? "Бүртгүүлэх" : "Нэвтрэх"}
        </button>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
