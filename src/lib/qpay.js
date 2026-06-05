// QPay token-ийг кэшлэх + timestamp-аар нь дахин ашиглах
// Анхааруулгын дагуу: token нь хугацаатай, хугацаа дуустал нэг л удаа авдаг.

let cachedToken = null;
let tokenExpiresAt = 0; // unix epoch ms

export async function getQpayToken() {
  const { QPAY_USERNAME, QPAY_PASSWORD, QPAY_BASE_URL } = process.env;
  if (!QPAY_USERNAME || !QPAY_PASSWORD) return null;

  // Кэштэй token хүчинтэй бол дахин ашиглана (1 минутын урьдчилсан нөөцтэй)
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const base = QPAY_BASE_URL || "https://merchant.qpay.mn/v2";
  const auth = Buffer.from(`${QPAY_USERNAME}:${QPAY_PASSWORD}`).toString("base64");

  const res = await fetch(`${base}/auth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("QPay token error:", res.status, text);
    throw new Error(`QPay token авахад алдаа гарлаа (${res.status}): ${text}`);
  }
  const data = await res.json();

  cachedToken = data.access_token;
  // expires_in нь секундоор ирдэг
  tokenExpiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  return cachedToken;
}

export function qpayBaseUrl() {
  return process.env.QPAY_BASE_URL || "https://merchant.qpay.mn/v2";
}
