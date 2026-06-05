"use client";
import { createBrowserClient } from "@supabase/ssr";

// Браузер (client component) талд ашиглах Supabase холболт
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
