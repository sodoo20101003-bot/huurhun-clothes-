import { getQpayToken, qpayBaseUrl } from "@/lib/qpay";
import { sendEmail, orderPaidEmailHtml } from "@/lib/email";

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ""));

/**
 * QPay захиалгыг шалгаж, төлсөн бол баталгаажуулна.
 * order: { id, order_code, qpay_invoice_id, payment_status, items, customer_name, total }
 * Хаанаас ч дуудаж болно (callback, polling, захиалга шалгах).
 */
export async function settleQpayOrder(admin, order) {
  if (!order) return { paid: false };
  if (order.payment_status === "paid") return { paid: true };

  let paid = false;
  let bankName = "qpay";
  try {
    const token = await getQpayToken();
    if (token && order.qpay_invoice_id) {
      const checkRes = await fetch(`${qpayBaseUrl()}/payment/check`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          object_type: "INVOICE",
          object_id: order.qpay_invoice_id,
          offset: { page_number: 1, page_limit: 100 },
        }),
      });
      const check = await checkRes.json();
      paid = Number(check?.count) > 0 || Number(check?.paid_amount) > 0;
      const row = check?.rows?.[0];
      if (row) bankName = row.payment_wallet || row.paid_by || row.payment_name || "qpay";
    }
  } catch (e) {
    console.error("QPay check error:", e.message);
  }

  if (!paid) return { paid: false };

  await admin.from("orders").update({ payment_status: "paid", status: "paid" }).eq("id", order.id);

  // Борлуулалтад давхардахгүй нэг л удаа бичих
  const { data: existing } = await admin
    .from("sales")
    .select("id")
    .eq("order_code", order.order_code)
    .limit(1);
  if (!existing?.length) {
    const rows = (order.items || []).map((it) => ({
      product_id: it.productId || null,
      product_name: it.name || "Бараа",
      size: it.size || null,
      color: it.color || null,
      qty: Number(it.qty || 1),
      unit_price: Number(it.unitPrice || 0),
      total: Number(it.unitPrice || 0) * Number(it.qty || 1),
      channel: "web",
      payment_method: bankName,
      order_code: order.order_code,
    }));
    if (rows.length) await admin.from("sales").insert(rows);

    if (isEmail(order.customer_name)) {
      try {
        await sendEmail({
          to: order.customer_name,
          subject: `✅ Төлбөр амжилттай — захиалга #${order.order_code}`,
          html: orderPaidEmailHtml(order.order_code, order.total),
        });
      } catch (e) {
        console.error("Email send error:", e.message);
      }
    }
  }

  return { paid: true };
}
