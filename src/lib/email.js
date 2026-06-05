// Resend ашиглан имэйл илгээх туслах
// .env.local болон Vercel дээр RESEND_API_KEY-г тохируулсан байх ёстой.

export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return null;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "huurhun <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Resend error:", res.status, text);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error("Email send error:", e.message);
    return null;
  }
}

// Хүргэлт амжилттай болсон үед явуулах имэйл
export function deliveryEmailHtml(orderCode) {
  return `
  <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #FBF7F0; color: #2C3A57;">
    <div style="background: #2C3A57; color: #FBF7F0; padding: 32px; text-align: center; border-radius: 16px;">
      <div style="font-size: 48px; margin-bottom: 8px;">✓</div>
      <h1 style="margin: 0; font-size: 24px;">Захиалга хүргэгдлээ!</h1>
      <p style="margin: 8px 0 0; opacity: 0.7;">Захиалгын код: <b style="color: #F2A24E;">${orderCode}</b></p>
    </div>
    <div style="padding: 24px 0;">
      <p>Сайн байна уу!</p>
      <p>Таны <b>#${orderCode}</b> дугаартай захиалга амжилттай хүргэгдлээ. 🎉</p>
      <p>Манайхаас худалдан авалт хийсэнд баярлалаа! Бүтээгдэхүүний талаар санал хүсэлт байвал бидэнтэй холбогдоорой.</p>
      <p style="margin-top: 24px;">
        <a href="https://www.instagram.com/huurhun_clothes" style="display: inline-block; background: #F2A24E; color: #2C3A57; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">📸 @huurhun_clothes</a>
      </p>
    </div>
    <p style="text-align: center; color: #2C3A57; opacity: 0.5; font-size: 12px; padding-top: 16px; border-top: 1px solid #2C3A57;">
      huurhun_clothes · +976 8522 9940
    </p>
  </div>`;
}

// Захиалга өгсний дараа кодыг явуулах имэйл
export function orderCreatedEmailHtml(orderCode, total) {
  const formatPrice = (n) => Number(n).toLocaleString("mn-MN") + "₮";
  return `
  <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #FBF7F0; color: #2C3A57;">
    <div style="background: #2C3A57; color: #FBF7F0; padding: 32px; text-align: center; border-radius: 16px;">
      <div style="font-size: 48px; margin-bottom: 8px;">🦆</div>
      <h1 style="margin: 0; font-size: 22px;">Захиалга амжилттай!</h1>
      <p style="margin: 12px 0 4px; opacity: 0.7; font-size: 13px;">Захиалгын код</p>
      <p style="margin: 0; font-family: monospace; font-size: 28px; font-weight: 700; color: #F2A24E; letter-spacing: 2px;">${orderCode}</p>
    </div>
    <div style="padding: 24px 0;">
      <p>Сайн байна уу!</p>
      <p>Таны захиалгыг бид хүлээн авлаа. <b>QPay-ээр төлбөрөө төлснөөр</b> бид захиалгыг бэлдэж эхэлнэ.</p>
      <div style="background: white; border: 1px solid #2C3A5722; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 13px; color: #2C3A5799;">Дүн</p>
        <p style="margin: 4px 0 0; font-size: 22px; font-weight: 700;">${formatPrice(total)}</p>
      </div>
      <p style="font-size: 14px;"><b>📌 Чухал:</b> 6 оронтой кодоо хадгалаарай. Хүргэлтийн ажилтанд энэ кодыг хэлэх ёстой.</p>
      <p style="margin-top: 24px;">
        <a href="https://huurhunclothes.com/order/${orderCode}" style="display: inline-block; background: #F2A24E; color: #2C3A57; padding: 12px 24px; border-radius: 999px; text-decoration: none; font-weight: 600;">Захиалгын статусыг харах</a>
      </p>
    </div>
    <p style="text-align: center; color: #2C3A57; opacity: 0.5; font-size: 12px; padding-top: 16px; border-top: 1px solid #2C3A57;">
      huurhun_clothes · +976 8522 9940
    </p>
  </div>`;
}
