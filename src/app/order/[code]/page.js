import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice, ORDER_STATUS } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import CheckPayment from "./CheckPayment";

export const dynamic = "force-dynamic";

const INSTAGRAM = "https://www.instagram.com/huurhun_clothes?igsh=MTMyNXZ1bnhqczg3eA==";

export default async function OrderPage({ params }) {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("order_code,total,items,status,payment_status,status_message,qpay_qr_image,qpay_qr_text,qpay_urls,customer_name,phone,created_at")
    .eq("order_code", params.code)
    .single();

  if (!order) notFound();

  const paid = order.payment_status === "paid";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="card overflow-hidden">
        {/* ===== ДЭЭД ХЭСЭГ ===== */}
        <div className="bg-ink p-8 text-center text-cream">
          {paid ? (
            <>
              <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-green-500 text-3xl">✓</div>
              <p className="text-lg font-semibold">Төлбөр баталгаажлаа!</p>
              <p className="mt-4 text-sm text-cream/60">Таны захиалгын код</p>
              <p className="mt-1 select-all font-display text-4xl font-700 tracking-[0.3em] text-beak">
                {order.order_code}
              </p>
              <p className="mt-3 text-xs text-cream/50">
                Энэ кодыг хадгалаарай! Хүргэлт болон лавлагаанд ашиглана.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-beak text-3xl text-ink">⏳</div>
              <p className="text-lg font-semibold">Төлбөр хүлээгдэж байна</p>
              <p className="mt-2 text-sm text-cream/70">
                QPay-ээр төлбөрөө төлсний дараа таны 6 оронтой захиалгын код энд гарч ирнэ.
              </p>
            </>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* ===== ТӨЛӨВ ===== */}
          <div className="flex items-center justify-between">
            <span className={`chip ${paid ? "border-green-500 text-green-700" : "border-beak text-beak-600"}`}>
              {paid ? "Төлбөр төлсөн ✅" : "Төлбөр хүлээгдэж буй ⏳"}
            </span>
            {paid && <span className="chip border-ink/15">{ORDER_STATUS[order.status] || order.status}</span>}
          </div>

          {/* ===== АДМИН МЕССЕЖ (зөвхөн төлсний дараа) ===== */}
          {paid && order.status_message && (
            <div className="rounded-xl bg-beak-100 border border-beak/30 p-4">
              <p className="text-sm font-semibold text-ink">💬 Дэлгүүрээс мэдэгдэл:</p>
              <p className="mt-1 text-sm text-ink-400">{order.status_message}</p>
            </div>
          )}

          {/* ===== ЗАХИАЛГЫН БАРАА ===== */}
          <div>
            <p className="text-sm font-semibold mb-2">Захиалсан бараа</p>
            <div className="space-y-2 text-sm">
              {order.items?.map((it, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span className="text-ink-400">
                    {it.name} ×{it.qty}
                    {it.size ? ` · ${it.size}` : ""}{it.color ? ` · ${it.color}` : ""}
                  </span>
                  <span>{formatPrice(it.unitPrice * it.qty)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-ink/10 pt-3 text-lg font-700">
              <span>Нийт</span>
              <span className="font-display">{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* ===== ТӨЛБӨР ТӨЛӨӨГҮЙ БОЛ — QR КОД ===== */}
          {!paid && order.qpay_qr_image && (
            <>
              <div className="grid place-items-center rounded-2xl bg-cream p-6 text-center">
                <p className="mb-3 text-sm font-semibold">QPay-ээр уншуулж төлнө үү</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${order.qpay_qr_image}`}
                  alt="QPay QR"
                  className="h-52 w-52"
                />
                <p className="mt-3 text-xs text-ink-400">
                  Утасны камераар уншуулна, эсвэл доорх банкны апп-аар нээнэ.
                </p>
              </div>

              {/* Банкны апп руу шууд орох товчнууд */}
              {(Array.isArray(order.qpay_urls) && order.qpay_urls.length > 0) && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-center sm:text-left">📱 Утсаараа банкны апп-ээр нээх:</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {[
                      ...order.qpay_urls,
                      // QPay жагсаалтад байхгүй нэмэлт апп-ууд
                      ...(order.qpay_qr_text
                        ? [
                            {
                              name: "Pocket",
                              description: "Pocket",
                              logo: "https://play-lh.googleusercontent.com/QFx6qsAcVZJaqs_Mehbz0LqV0p_kJ_PEHfZ_zfYJEZQ",
                              link: `pocket://qr?data=${encodeURIComponent(order.qpay_qr_text)}`,
                            },
                            {
                              name: "Story Pay",
                              description: "Story Pay",
                              logo: "https://play-lh.googleusercontent.com/8wgKjEhB7gB6dgF1pTzMqVZxRfIQwzL_TaSpDhKbVNw",
                              link: `storypay://q?qPay_QRcode=${encodeURIComponent(order.qpay_qr_text)}`,
                            },
                          ]
                        : []),
                    ].map((b, i) => (
                      <a
                        key={i}
                        href={b.link}
                        className="flex flex-col items-center gap-1 rounded-xl bg-cream p-2 hover:bg-beak-100 transition"
                        title={b.description || b.name}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={b.logo} alt={b.name} className="h-10 w-10 rounded-lg object-contain bg-white" />
                        <span className="text-[10px] text-ink-400 text-center leading-tight line-clamp-1">
                          {b.description || b.name}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <CheckPayment code={order.order_code} />
            </>
          )}

          {/* ===== ТӨЛСНИЙ ДАРАА — ЗААВАР ===== */}
          {paid && (
            <>
              <div className="rounded-xl bg-cream p-5 space-y-4">
                <h3 className="font-display text-base font-600">📋 Дараа нь юу хийх вэ?</h3>

                <div className="space-y-3 text-sm text-ink-400">
                  <div className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-cream">1</span>
                    <p>
                      <b className="text-ink">Кодоо хадгалаарай</b> — дээрх 6 оронтой код бол таны захиалгын дугаар.
                      Хүргэлт ирэхэд кодоо хүргэлтийн ажилтанд хэлж өгнө.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-cream">2</span>
                    <p>
                      <b className="text-ink">Хүргэлтийн мэдээлэл</b> — бид танд удахгүй утсаар эсвэл Instagram-аар
                      хүргэлтийн цагийг мэдэгдэнэ.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-cream">3</span>
                    <p>
                      <b className="text-ink">Захиалга шалгах</b> — манай{" "}
                      <Link href="/chat" className="text-beak-600 font-semibold hover:underline">
                        чат бот
                      </Link>
                      {" "}руу кодоо илгээхэд хүргэлтийн төлвийг шууд харуулна.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-cream">4</span>
                    <p>
                      <b className="text-ink">Асуулт байвал</b> — Instagram хаягаар холбогдоорой:
                    </p>
                  </div>
                </div>

                <a
                  href={INSTAGRAM}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-xl bg-paper p-4 border border-ink/10 hover:border-beak/40 transition"
                >
                  <span className="text-2xl">📸</span>
                  <div>
                    <p className="font-semibold text-sm">@huurhun_clothes</p>
                    <p className="text-xs text-ink-400">Instagram-ээр бичих</p>
                  </div>
                </a>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link href="/chat" className="btn-primary flex-1 text-center">
                  💬 Захиалга шалгах бот
                </Link>
                <Link href="/" className="btn-ghost flex-1 text-center">
                  Дэлгүүр рүү буцах
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
