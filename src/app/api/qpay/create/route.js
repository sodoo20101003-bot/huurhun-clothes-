import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOrderCode } from "@/lib/utils";
import { getQpayToken, qpayBaseUrl } from "@/lib/qpay";
import { sendEmail, orderCreatedEmailHtml } from "@/lib/email";

// QPay v2 — нэхэмжлэх үүсгэх
async function createQpayInvoice({ code, amount, description, callbackUrl }) {
  const { QPAY_INVOICE_CODE } = process.env;
  const token = await getQpayToken();
  if (!token || !QPAY_INVOICE_CODE) return null;

  const invRes = await fetch(`${qpayBaseUrl()}/invoice`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      invoice_code: QPAY_INVOICE_CODE,
      sender_invoice_no: code,
      invoice_receiver_code: "terminal",
      invoice_description: description,
      amount: Math.round(amount),
      callback_url: callbackUrl,
    }),
  });
  if (!invRes.ok) {
    const text = await invRes.text();
    throw new Error(`QPay нэхэмжлэх үүсгэхэд алдаа гарлаа: ${text}`);
  }
  return await invRes.json();
}

export async function POST(request) {
  try {
    const { items, total, customer } = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Сагс хоосон байна" }, { status: 400 });
    }
    if (!customer?.name || !customer?.phone || !customer?.address) {
      return NextResponse.json({ error: "Хүргэлтийн мэдээлэл дутуу байна" }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Үлдэгдэл шалгах
    const admin = createAdminClient();
    for (const it of items) {
      if (!it.productId) continue;
      let q = admin.from("product_variants").select("stock").eq("product_id", it.productId);
      if (it.size) q = q.eq("size", it.size);
      if (it.color) q = q.eq("color", it.color);
      const { data: variants } = await q;
      if (variants?.length) {
        const totalStock = variants.reduce((s, v) => s + Number(v.stock || 0), 0);
        if (Number(it.qty) > totalStock) {
          return NextResponse.json({
            error: `"${it.name}" — зөвхөн ${totalStock} ширхэг үлдсэн байна`,
          }, { status: 400 });
        }
      }
    }

    const code = generateOrderCode();

    const { data: order, error } = await admin
      .from("orders")
      .insert({
        order_code: code,
        user_id: user?.id ?? null,
        items,
        total: Math.round(total),
        customer_name: customer.name,
        phone: customer.phone,
        address: customer.address,
        note: customer.note || null,
        status: "pending",
        payment_status: "pending",
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    // Үлдэгдлээс хасах (бараа бүрийн variant дээр)
    try {
      for (const it of items) {
        if (!it.productId) continue;
        // size/color-той variant хайх
        let q = admin.from("product_variants").select("id,stock").eq("product_id", it.productId);
        if (it.size) q = q.eq("size", it.size);
        if (it.color) q = q.eq("color", it.color);
        const { data: variants } = await q;
        if (variants?.length) {
          // Эхний таарсан variant-ийг олно (нэг бараа дээр ижил size/color давхцахгүй)
          const v = variants[0];
          const newStock = Math.max(0, Number(v.stock || 0) - Number(it.qty || 0));
          await admin.from("product_variants").update({ stock: newStock }).eq("id", v.id);
        }
      }
    } catch (e) {
      console.error("Stock deduct error:", e.message);
    }

    // QPay (тохиргоо хийгдсэн бол)
    let qpay = null;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    try {
      qpay = await createQpayInvoice({
        code,
        amount: total,
        description: `huurhun_clothes захиалга #${code}`,
        callbackUrl: `${siteUrl}/api/qpay/callback?code=${code}`,
      });
      if (qpay?.invoice_id) {
        await admin
          .from("orders")
          .update({
            qpay_invoice_id: qpay.invoice_id,
            qpay_qr_text: qpay.qr_text || null,
            qpay_qr_image: qpay.qr_image || null,
            qpay_urls: qpay.urls || null,
          })
          .eq("id", order.id);
      }
    } catch (e) {
      console.error("QPay:", e.message);
    }

    // Захиалагчийн имэйл хаягт код илгээх (customer_name талбар нь имэйл бол)
    if (customer.name && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.name)) {
      try {
        await sendEmail({
          to: customer.name,
          subject: `🦆 Таны захиалгын код: ${code}`,
          html: orderCreatedEmailHtml(code, total),
        });
      } catch (e) {
        console.error("Email send error:", e.message);
      }
    }

    return NextResponse.json({ code, qpay });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
