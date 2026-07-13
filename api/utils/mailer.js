// api/utils/mailer.js
// Sends transactional emails via SMTP. If SMTP env vars are not configured,
// every send becomes a logged no-op so booking flows never break.
const nodemailer = require('nodemailer');

const {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
} = process.env;

let transporter = null;

if (EMAIL_HOST && EMAIL_USER && EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT) || 587,
    secure: Number(EMAIL_PORT) === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
} else {
  console.warn(
    'Email disabled: set EMAIL_HOST, EMAIL_USER, EMAIL_PASS (and optionally EMAIL_PORT, EMAIL_FROM) to enable notifications.'
  );
}

/**
 * Fire-and-forget email send. Never throws — callers must not fail
 * a booking or status update because a notification could not be sent.
 */
const sendMail = async ({ to, subject, html }) => {
  if (!transporter || !to) return false;

  try {
    await transporter.sendMail({
      from: EMAIL_FROM || EMAIL_USER,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error('sendMail error:', err?.message || err);
    return false;
  }
};

const emailWrap = (body) => `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
    <h2 style="color: #1976D2; margin-bottom: 16px;">WareShare</h2>
    ${body}
    <p style="margin-top: 24px; font-size: 12px; color: #888;">
      You received this email because of activity on your WareShare account.
    </p>
  </div>
`;

module.exports = { sendMail, emailWrap };
