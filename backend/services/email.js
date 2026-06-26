// services/email.js — Envoi d'emails via Nodemailer
// Dev : Ethereal (fake SMTP, emails visibles sur ethereal.email)
// Prod : configurer SMTP_* ou MAIL_DSN dans .env

const nodemailer = require('nodemailer');

let transporter = null;
let lastError = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST) {
    const port = parseInt(process.env.SMTP_PORT || '587');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 6000,
      greetingTimeout: 6000,
      socketTimeout: 10000,
      tls: { rejectUnauthorized: false },
    });

    // Test immédiat — si échec sur ce port, tente port 2525 (alternatif SendGrid)
    try {
      await transporter.verify();
    } catch (e) {
      console.error(`⚠️ SMTP port ${port} échoué:`, e.message);
      if (port === 587) {
        console.log('🔄 Tentative sur port 2525...');
        process.env.SMTP_PORT = '2525';
        transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: 2525,
          secure: false,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
          connectionTimeout: 6000,
          greetingTimeout: 6000,
          socketTimeout: 10000,
          tls: { rejectUnauthorized: false },
        });
        await transporter.verify();
        console.log('✅ SMTP OK sur port 2525');
      } else {
        throw e;
      }
    }
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
  try {
    const info = await t.sendMail({
      from: `"ForInsurance" <${process.env.SMTP_FROM || 'noreply@forinsurance.cm'}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Email envoyé à ${to}: "${subject}"`);
    if (!process.env.SMTP_HOST) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('📬 Preview:', previewUrl);
    }
    return info;
  } catch (e) {
    console.error(`❌ Échec envoi email à ${to}:`, e.message);
    lastError = e;
    throw e;
  }
}

function getLastEmailError() { return lastError; }

module.exports = { sendMail, getLastEmailError };
