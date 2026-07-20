
const nodemailer = require("nodemailer");
const env = require("../../config/env");
const logger = require("./logger");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: env.MAIL_USER, pass: env.MAIL_PASS },
  tls: { rejectUnauthorized: false }
});

async function sendMail(to, subject, html) {
  const info = await transporter.sendMail({
    from: `"Restaurant System" <${env.MAIL_USER}>`,
    to,
    subject,
    html,
  });
  logger.info({ messageId: info.messageId }, "Gửi mail thành công");
  return info;
}

module.exports = { sendMail };
