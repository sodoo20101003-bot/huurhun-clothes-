import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { settleQpayOrder } from "@/lib/qpay-settle";

export const dynamic = "force-dynamic";

export async function GET(request) { return handle(request); }
export async function POST(request) { return handle(request); }

async function handle(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    if (!code) return NextResponse.json({ error: "code дутуу" }, { status: 400 });

    const admin = createAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select("id, order_code, qpay_invoice_id, payment_status, items, customer_name, total")
      .eq("order_code", code)
      .single();
    if (!order) return NextResponse.json({ error: "Захиалга олдсонгүй" }, { status: 404 });

    const { paid } = await settleQpayOrder(admin, order);
    return NextResponse.json({ ok: true, paid });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
