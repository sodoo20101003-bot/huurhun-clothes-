"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginInner() {
  const params = useSearchParams();
  const next = params.get("next") || params.get("redirect") || "/profile";
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState("");

  async function google() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  async function emailLink() {
    setMsg("");
    if (!email) return setMsg("Имэйлээ оруулна уу");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) setMsg(error.message);
    else setSent(true);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card p-8">
        <h1 className="font-display text-2xl font-700">Нэвтрэх</h1>
        <p className="mt-1 text-sm text-ink-400">Захиалгаа хянах, түүхээ үзэхийн тулд нэвтэрнэ үү.</p>

        <button onClick={google} className="btn-ghost mt-6 w-full">
          <span className="text-lg">G</span> Google-ээр нэвтрэх
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-ink/30">
          <span className="h-px flex-1 bg-ink/10" /> эсвэл <span className="h-px flex-1 bg-ink/10" />
        </div>

        {sent ? (
          <p className="rounded-2xl bg-beak-100 p-4 text-sm text-ink">
            ✉️ {email} хаяг руу нэвтрэх холбоос илгээлээ. Имэйлээ шалгана уу.
          </p>
        ) : (
          <div className="space-y-3">
            <input
              type="email"
              className="input"
              placeholder="имэйл хаяг"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button onClick={emailLink} className="btn-primary w-full">Имэйлээр холбоос авах</button>
            {msg && <p className="text-sm text-red-600">{msg}</p>}
          </div>
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
