// Gui mail qua Brevo HTTP API (cong 443) thay vi SMTP — vi Render CHAN cong SMTP (25/465/587).
// Giu nguyen chu ky sendMail(to, subject, html) de cac cho goi khong phai doi.
const env = require("../../config/env");
const logger = require("./logger");

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

async function sendMail(to, subject, html) {
  if (!env.BREVO_API_KEY) {
    logger.warn("BREVO_API_KEY chưa cấu hình — bỏ qua gửi mail");
    return;
  }
  const from = env.MAIL_FROM || env.MAIL_USER; // email nguoi gui (phai da verify tren Brevo)

  const res = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": env.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { email: from, name: "Restaurant System" },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.error({ status: res.status, body }, "Gửi mail Brevo thất bại");
    throw new Error(`Brevo ${res.status}: ${body}`);
  }

  const data = await res.json().catch(() => ({}));
  logger.info({ messageId: data.messageId }, "Gửi mail thành công (Brevo)");
  return data;
}

module.exports = { sendMail };
