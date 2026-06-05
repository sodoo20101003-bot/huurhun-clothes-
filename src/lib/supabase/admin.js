import { createClient } from "@supabase/supabase-js";

// ЗӨВХӨН серверт (API route, server action). Service role нь RLS-ийг алгасдаг тул
// хэзээ ч клиент талд импортлож болохгүй.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
