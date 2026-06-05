import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// OAuth / magic link-ийн дараа session үүсгэх
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/profile";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
