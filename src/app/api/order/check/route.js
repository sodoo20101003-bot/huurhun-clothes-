import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ORDER_STATUS } from "@/lib/utils";

// Захиалгын код-оор төлөв шалгах (chat bot + хэрэглэгчийн хэрэгцээнд)
export async function POST(request) {
  try {
    const { code } = await request.json();
    if (!code || code.length < 6) {
      return NextResponse.json({ error: "Захиалгын кодоо оруулна уу" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select("order_code,status,payment_status,status_message,customer_name,total,items,created_at")
      .eq("order_code", code.trim())
      .single();

    if (!order) {
      return NextResponse.json({ found: false, message: "Энэ кодтой захиалга олдсонгүй. Кодоо дахин шалгана уу." });
    }

    const statusLabel = ORDER_STATUS[order.status] || order.status;
    const paidLabel = order.payment_status === "paid" ? "Төлбөр төлсөн ✅" : "Төлбөр хүлээгдэж буй ⏳";
    const itemCount = order.items?.length || 0;

    let message = `📦 Захиалга #${order.order_code}\n`;
    message += `👤 ${order.customer_name}\n`;
    message += `💰 ${paidLabel}\n`;
    message += `📋 Төлөв: ${statusLabel}\n`;
    message += `🛍 ${itemCount} төрөл бараа\n`;

    if (order.status_message) {
      message += `\n💬 ${order.status_message}`;
    }

    return NextResponse.json({
      found: true,
      message,
      status: order.status,
      payment_status: order.payment_status,
      status_message: order.status_message,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
