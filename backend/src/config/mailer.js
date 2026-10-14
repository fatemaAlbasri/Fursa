const nodemailer = require('nodemailer');

// Without SMTP settings in .env (local development) emails are printed to the console instead
const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

async function sendMail({ to, subject, text, html }) {
  if (!transporter) {
    console.log(`\n--- Email (SMTP not set up) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n------------------------------\n`);
    return;
  }
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendMail };
