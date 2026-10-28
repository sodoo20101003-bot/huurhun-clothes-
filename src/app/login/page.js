"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Утасны дугаарыг синтетик имэйл болгон хувиргах (SMS шаардахгүй)
// Жишээ: "9911 2233" → "99112233@phone.huurhunclothes.com"
function normalizePhone(raw) {
  let p = String(raw || "").replace(/\D/g, ""); // зөвхөн тоо
  if (p.startsWith("976")) p = p.slice(3); // улсын код хасах
  return p;
}
function phoneToEmail(phone) {
  return `${phone}@phone.huurhunclothes.com`;
}

function LoginInner() {
  const params = useSearchParams();
  const next = params.get("next") || params.get("redirect") || "/profile";
  const supabase = createClient();

  const [mode, setMode] = useState("login"); // login | signup
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [showEmail, setShowEmail] = useState(false);

  async function google() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  async function phoneAuth() {
    setMsg("");
    const p = normalizePhone(phone);
    if (!/^\d{8}$/.test(p)) return setMsg("Утасны дугаараа зөв оруулна уу (8 оронтой)");
    if (password.length < 6) return setMsg("Нууц үг дор хаяж 6 тэмдэгт байх ёстой");
    if (mode === "signup" && password !== password2) return setMsg("Нууц үг таарахгүй байна");

    setBusy(true);
    const synthEmail = phoneToEmail(p);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: synthEmail,
          password,
          options: { data: { phone: p, full_name: p } },
        });
        if (error) {
          if (/already registered|already been registered|exists/i.test(error.message))
            setMsg("Энэ дугаар бүртгэлтэй байна. Нэвтрэх хэсгээр орно уу.");
          else setMsg(error.message);
          setBusy(false);
          return;
        }
        // confirmations унтраалттай бол session шууд үүснэ
        if (!data.session) {
          // signUp session буцаагаагүй бол шууд нэвтрэхийг оролдоно
          const { error: e2 } = await supabase.auth.signInWithPassword({ email: synthEmail, password });
          if (e2) { setMsg("Бүртгэл үүслээ. Одоо нэвтэрнэ үү."); setMode("login"); setBusy(false); return; }
        }
        location.href = next;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: synthEmail, password });
        if (error) {
          setMsg("Дугаар эсвэл нууц үг буруу байна");
          setBusy(false);
          return;
        }
        location.href = next;
      }
    } catch (e) {
      setMsg(e.message || "Алдаа гарлаа");
      setBusy(false);
    }
  }

  async function emailLink() {
    setEmailMsg("");
    if (!email) return setEmailMsg("Имэйлээ оруулна уу");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) setEmailMsg(error.message);
    else setSent(true);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8">
        <h1 className="font-display text-2xl font-700">{mode === "signup" ? "Бүртгүүлэх" : "Нэвтрэх"}</h1>
        <p className="mt-1 text-sm text-ink-400">Захиалгаа хянах, түүхээ үзэхийн тулд нэвтэрнэ үү.</p>

        {/* Нэвтрэх / Бүртгүүлэх таб */}
        <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-cream/60 p-1">
          <button onClick={() => { setMode("login"); setMsg(""); }}
            className={`rounded-lg py-2 text-sm font-semibold transition ${mode === "login" ? "bg-ink text-cream" : "text-ink-400"}`}>Нэвтрэх</button>
          <button onClick={() => { setMode("signup"); setMsg(""); }}
            className={`rounded-lg py-2 text-sm font-semibold transition ${mode === "signup" ? "bg-ink text-cream" : "text-ink-400"}`}>Бүртгүүлэх</button>
        </div>

        {/* Утас + нууц үг */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center rounded-2xl border border-ink/15 bg-paper focus-within:border-beak overflow-hidden">
            <span className="px-3 text-sm text-ink-400 border-r border-ink/10 py-3">🇲🇳 +976</span>
            <input type="tel" inputMode="numeric" className="flex-1 bg-transparent px-3 py-3 outline-none"
              placeholder="99112233" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <input type="password" className="input" placeholder="Нууц үг"
            value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && mode === "login") phoneAuth(); }} />
          {mode === "signup" && (
            <input type="password" className="input" placeholder="Нууц үг давтах"
              value={password2} onChange={(e) => setPassword2(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") phoneAuth(); }} />
          )}
          <button onClick={phoneAuth} disabled={busy} className="btn-primary w-full">
            {busy ? "Түр хүлээнэ үү..." : mode === "signup" ? "Бүртгүүлэх" : "Нэвтрэх"}
          </button>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-ink/30">
          <span className="h-px flex-1 bg-ink/10" /> эсвэл <span className="h-px flex-1 bg-ink/10" />
        </div>

        {/* Google */}
        <button onClick={google} className="btn-ghost w-full">
          <span className="text-lg">G</span> Google-ээр нэвтрэх
        </button>

        {/* Имэйлээр холбоос (нэмэлт) */}
        <button onClick={() => setShowEmail((s) => !s)} className="mt-3 w-full text-center text-xs text-ink-400 hover:text-ink">
          {showEmail ? "▲ Имэйлийг хаах" : "▼ Имэйлээр нэвтрэх"}
        </button>
        {showEmail && (
          sent ? (
            <p className="mt-3 rounded-2xl bg-beak-100 p-4 text-sm text-ink">
              ✉️ {email} хаяг руу нэвтрэх холбоос илгээлээ. Имэйлээ шалгана уу.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <input type="email" className="input" placeholder="имэйл хаяг"
                value={email} onChange={(e) => setEmail(e.target.value)} />
              <button onClick={emailLink} className="btn-ghost w-full">Имэйлээр холбоос авах</button>
              {emailMsg && <p className="text-sm text-red-600">{emailMsg}</p>}
            </div>
          )
        )}
      </div>
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
