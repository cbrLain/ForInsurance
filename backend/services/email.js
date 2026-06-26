// services/email.js — Envoi d'emails via Nodemailer
// Dev : Ethereal (fake SMTP, emails visibles sur ethereal.email)
// Prod : configurer SMTP_* ou MAIL_DSN dans .env

const nodemailer = require('nodemailer');

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Dev : Ethereal (fake SMTP, gratuit, sans inscription)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('📧 Ethereal email :', testAccount.user);
  }
  return transporter;
}

async function sendMail({ to, subject, html }) {
  const t = await getTransporter();
  const info = await t.sendMail({
    from: `"ForInsurance" <${process.env.SMTP_FROM || 'noreply@forinsurance.cm'}>`,
    to,
    subject,
    html,
  });

  if (!process.env.SMTP_HOST) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('📬 Email dev :', previewUrl);
  }
  return info;
}

module.exports = { sendMail };
