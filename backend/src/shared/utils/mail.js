// Gui mail qua Resend HTTP API (cong 443) — Render chan SMTP (25/465/587).
// Giu nguyen chu ky sendMail(to, subject, html) de cac cho goi khong phai doi.
const env = require("../../config/env");
const logger = require("./logger");

const RESEND_URL = "https://api.resend.com/emails";

async function sendMail(to, subject, html) {
  if (!env.RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY chưa cấu hình — bỏ qua gửi mail");
    return;
  }
  const from = env.MAIL_FROM || env.MAIL_USER; // vd: "Restaurant <no-reply@yourdomain.com>" — domain phai verify tren Resend

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: from.includes("<") ? from : `Restaurant System <${from}>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.error({ status: res.status, body }, "Gửi mail Resend thất bại");
    throw new Error(`Resend ${res.status}: ${body}`);
  }

  const data = await res.json().catch(() => ({}));
  logger.info({ id: data.id }, "Gửi mail thành công (Resend)");
  return data;
}

module.exports = { sendMail };
