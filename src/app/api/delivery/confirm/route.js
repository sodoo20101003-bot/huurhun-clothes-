import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, deliveryEmailHtml } from "@/lib/email";

export const dynamic = "force-dynamic";

// Хүргэлтийн ажилтан 6 оронтой кодыг оруулж баталгаажуулна.
// Body: { code: "123456789012", workerPass: "huurhun2026" }
export async function POST(request) {
  try {
    const { code, workerPass } = await request.json();

    if (workerPass !== "huurhun2026") {
      return NextResponse.json({ error: "Эрх байхгүй" }, { status: 401 });
    }
    if (!/^\d{6}$/.test(String(code || "").trim())) {
      return NextResponse.json({ error: "6 оронтой код буруу" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select("id,order_code,status,customer_name")
      .eq("order_code", String(code).trim())
      .single();

    if (!order) {
      return NextResponse.json({ error: "Захиалга олдсонгүй" }, { status: 404 });
    }
    if (order.status === "shipped") {
      return NextResponse.json({ ok: true, alreadyShipped: true, orderCode: order.order_code });
    }

    await admin
      .from("orders")
      .update({
        status: "shipped",
        status_message: "Захиалга хүргэгдлээ. Баярлалаа!",
      })
      .eq("id", order.id);

    // Имэйл явуулах (хэрэв имэйл байвал — customer_name дотор имэйл байж магадгүй)
    const maybeEmail = order.customer_name;
    if (maybeEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(maybeEmail)) {
      await sendEmail({
        to: maybeEmail,
        subject: `✅ Таны #${order.order_code} захиалга хүргэгдлээ`,
        html: deliveryEmailHtml(order.order_code),
      });
    }

    return NextResponse.json({ ok: true, orderCode: order.order_code, emailSent: !!maybeEmail });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
