const nodemailer = require("nodemailer");
const { config } = require("../../config/env");

function getTransport() {
  const host = config.smtp?.host || process.env.SMTP_HOST;
  const port = Number(config.smtp?.port || process.env.SMTP_PORT || 465);
  const secure = String(config.smtp?.secure ?? process.env.SMTP_SECURE ?? "true") === "true";
  const user = config.smtp?.user || process.env.SMTP_USER;
  const pass = config.smtp?.pass || process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function sendMail({ to, subject, text }) {
  const transport = getTransport();
  if (!transport) {
    console.warn("⚠️ SMTP 설정이 없어 메일 발송을 스킵합니다.");
    const shouldLog =
      (config.nodeEnv ?? process.env.NODE_ENV ?? "development") !== "production" &&
      String(process.env.MAIL_LOG_ON_SKIP ?? "true") === "true";
    if (shouldLog) console.log("[MAIL SKIP]", { to, subject, text });
    return;
  }

  const from = config.smtp?.from || process.env.MAIL_FROM || userFallbackFrom();

  await transport.sendMail({ from, to, subject, text });
}

function userFallbackFrom() {
  return process.env.SMTP_USER ? `YogiZogi <${process.env.SMTP_USER}>` : "YogiZogi";
}

module.exports = { sendMail };
