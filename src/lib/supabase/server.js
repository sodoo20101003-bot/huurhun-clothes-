import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Сервер (server component / route) талд ашиглах Supabase холболт
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (_) {
            // Server Component-аас дуудвал алдаа гарч болзошгүй — middleware-д шийдэгдэнэ
          }
        },
      },
    }
  );
}
