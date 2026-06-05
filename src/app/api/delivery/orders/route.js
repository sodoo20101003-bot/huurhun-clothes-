import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Хүргэлтийн ажилтны жагсаалт — service role-оор унших (RLS-ийг тойрно)
// Body: { workerPass }
export async function POST(request) {
  try {
    const { workerPass } = await request.json();
    if (workerPass !== "huurhun2026") {
      return NextResponse.json({ error: "Эрх байхгүй" }, { status: 401 });
    }
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("orders")
      .select("id,order_code,address,phone,note,total,status,payment_status,created_at,customer_name,items")
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ orders: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
