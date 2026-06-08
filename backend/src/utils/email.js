// © 2025-2026 Sven Krische · TeslaView · PolyForm Noncommercial 1.0.0 · https://github.com/KnevS/Tesla-Carview
import nodemailer from 'nodemailer';

const SMTP_KEYS = ['smtp.host', 'smtp.port', 'smtp.user', 'smtp.password', 'smtp.from'];

function loadSmtpConfig(db) {
  const rows = db.prepare(
    `SELECT key, value FROM tenant_settings WHERE key IN (${SMTP_KEYS.map(() => '?').join(',')})`
  ).all(...SMTP_KEYS);
  return Object.fromEntries(rows.map(r => [r.key.replace('smtp.', ''), r.value]));
}

export function isSmtpConfigured(db) {
  const cfg = loadSmtpConfig(db);
  return !!(cfg.host && cfg.user && cfg.password);
}

export async function sendEmail(db, { to, subject, text, html }) {
  const cfg = loadSmtpConfig(db);
  if (!cfg.host || !cfg.user || !cfg.password) throw new Error('SMTP nicht konfiguriert');

  const port = parseInt(cfg.port) || 587;
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port,
    secure: port === 465,
    auth: { user: cfg.user, pass: cfg.password },
  });

  await transporter.sendMail({
    from: cfg.from || cfg.user,
    to,
    subject,
    text,
    html,
  });
}
