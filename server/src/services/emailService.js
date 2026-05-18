const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const getSmtpConfig = () => ({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || 'true') === 'true',
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  inbox: process.env.CONTACT_INBOX || process.env.SMTP_USER,
  fromName: process.env.CONTACT_FROM_NAME || 'Buyer Trend Lens',
  supportEmail: process.env.CONTACT_INBOX || process.env.SMTP_USER,
  publicAppUrl: process.env.PUBLIC_APP_URL || process.env.CLIENT_URL || 'https://buyertrendlens.com'
});

const createTransporter = () => {
  const config = getSmtpConfig();

  if (!config.user || !config.pass || !config.inbox) {
    throw new Error('SMTP is not configured. Set SMTP_USER, SMTP_PASS, and CONTACT_INBOX on the server.');
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
};

const logoPath = path.resolve(__dirname, '../../../logo.png');

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildEmailShell = ({ eyebrow, title, intro, badgeLabel, badgeTone, details, closingHtml }) => {
  const config = getSmtpConfig();
  const hasLogoAttachment = fs.existsSync(logoPath);
  const logoMarkup = hasLogoAttachment
    ? '<img src="cid:buyertrendlens-logo" alt="Buyer Trend Lens" style="display:block;height:52px;width:auto;" />'
    : `<div style="font-size:28px;font-weight:800;letter-spacing:-0.03em;color:#ffffff;">Buyer Trend Lens</div>`;

  return {
    html: `
      <div style="margin:0;padding:32px 18px;background:#081722;font-family:Arial,sans-serif;color:#d7e0ea;">
        <div style="max-width:640px;margin:0 auto;overflow:hidden;border:1px solid #203645;border-radius:28px;background:linear-gradient(180deg,#0b1d29 0%,#10223a 100%);box-shadow:0 30px 80px rgba(0,0,0,0.28);">
          <div style="padding:28px 28px 0;">
            ${logoMarkup}
          </div>
          <div style="padding:24px 28px 32px;">
            <div style="display:inline-block;padding:8px 12px;border-radius:999px;background:${badgeTone};color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">
              ${escapeHtml(badgeLabel)}
            </div>
            <p style="margin:18px 0 0;color:#94a9bb;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
            <h1 style="margin:12px 0 0;color:#ffffff;font-size:34px;line-height:1.08;letter-spacing:-0.04em;">${escapeHtml(title)}</h1>
            <p style="margin:18px 0 0;color:#c3cfdb;font-size:16px;line-height:1.75;">${escapeHtml(intro)}</p>

            <div style="margin-top:26px;border:1px solid #2a3b57;border-radius:24px;background:rgba(255,255,255,0.04);padding:22px;">
              ${details
                .map(
                  ({ label, value }) => `
                    <div style="padding:${label === details[0].label ? '0' : '14px'} 0 0;${label === details[0].label ? '' : 'border-top:1px solid rgba(255,255,255,0.08);margin-top:14px;'}">
                      <div style="color:#8ea0b3;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">${escapeHtml(label)}</div>
                      <div style="margin-top:6px;color:#ffffff;font-size:16px;font-weight:700;line-height:1.5;">${escapeHtml(value)}</div>
                    </div>
                  `
                )
                .join('')}
            </div>

            <div style="margin-top:24px;color:#c3cfdb;font-size:15px;line-height:1.75;">
              ${closingHtml}
            </div>
          </div>
          <div style="padding:18px 28px 28px;border-top:1px solid rgba(255,255,255,0.08);color:#8ea0b3;font-size:13px;line-height:1.7;">
            Need help? Contact us at <a href="mailto:${escapeHtml(config.supportEmail)}" style="color:#35d6a4;text-decoration:none;">${escapeHtml(config.supportEmail)}</a>.
          </div>
        </div>
      </div>
    `,
    attachments: hasLogoAttachment
      ? [
          {
            filename: 'buyertrendlens-logo.png',
            path: logoPath,
            cid: 'buyertrendlens-logo'
          }
        ]
      : []
  };
};

const sendContactEmail = async ({ name, email, company, subject, message }) => {
  const config = getSmtpConfig();
  const transporter = createTransporter();

  const trimmedCompany = company?.trim() || 'Not provided';
  const trimmedSubject = subject?.trim() || 'Buyer Trend Lens Inquiry';

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.user}>`,
    to: config.inbox,
    replyTo: email,
    subject: trimmedSubject,
    text: [
      `Name: ${name}`,
      `Email: ${email}`,
      `Company: ${trimmedCompany}`,
      '',
      'Message:',
      message
    ].join('\n')
  });
};

const sendPaymentStatusEmail = async ({
  to,
  name,
  reference,
  amount,
  coins,
  status,
  reviewedAt = new Date()
}) => {
  const config = getSmtpConfig();
  const transporter = createTransporter();
  const isApproved = status === 'approved';
  const subject = isApproved
    ? 'Your payment has been approved'
    : 'Your payment request was not approved';
  const shell = buildEmailShell({
    eyebrow: 'Payment Update',
    title: isApproved ? 'Your payment is approved' : 'Your payment was declined',
    intro: isApproved
      ? 'Your payment has been reviewed successfully. Your coins are now available and you can continue using Buyer Trend Lens.'
      : 'Your payment request has been reviewed and was not approved at this time.',
    badgeLabel: isApproved ? 'Approved' : 'Declined',
    badgeTone: isApproved ? '#0d9f6e' : '#c2410c',
    details: [
      { label: 'Reference', value: reference },
      { label: 'Amount', value: `${Number(amount || 0).toFixed(2)} USDT` },
      { label: 'Coins', value: `${Number(coins || 0).toFixed(2)} coins` },
      {
        label: 'Reviewed',
        value: new Intl.DateTimeFormat('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short'
        }).format(new Date(reviewedAt))
      }
    ],
    closingHtml: isApproved
      ? `<p style="margin:0;">Hello ${escapeHtml(name)},</p>
         <p style="margin:14px 0 0;">Your payment has been approved and credited to your account. You can now log in and use your balance.</p>
         <p style="margin:14px 0 0;"><a href="${escapeHtml(config.publicAppUrl)}" style="display:inline-block;padding:12px 18px;border-radius:14px;background:#1dd4a5;color:#06231d;font-weight:700;text-decoration:none;">Open Buyer Trend Lens</a></p>`
      : `<p style="margin:0;">Hello ${escapeHtml(name)},</p>
         <p style="margin:14px 0 0;">Your payment request could not be approved. If you have any further questions or need help reviewing the submission, please contact our team by email.</p>
         <p style="margin:14px 0 0;">We will be happy to assist you.</p>`
  });

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.user}>`,
    to,
    subject,
    html: shell.html,
    text: isApproved
      ? `Hello ${name}, your payment (${reference}) has been approved. ${Number(coins || 0).toFixed(2)} coins have been credited to your account.`
      : `Hello ${name}, your payment (${reference}) was not approved. If you have any questions, please contact ${config.supportEmail}.`,
    attachments: shell.attachments
  });
};

const sendSignupOtpEmail = async ({ to, name, otp, expiresInMinutes = 10 }) => {
  const config = getSmtpConfig();
  const transporter = createTransporter();
  const shell = buildEmailShell({
    eyebrow: 'Signup Verification',
    title: 'Verify your email address',
    intro: 'Use the one-time code below to complete your Buyer Trend Lens signup.',
    badgeLabel: 'OTP Required',
    badgeTone: '#0d9f6e',
    details: [
      { label: 'Verification code', value: otp },
      { label: 'Expires in', value: `${expiresInMinutes} minutes` },
      { label: 'Account email', value: to }
    ],
    closingHtml: `<p style="margin:0;">Hello ${escapeHtml(name)},</p>
      <p style="margin:14px 0 0;">Enter this code on the signup screen to verify your email and activate your account.</p>
      <p style="margin:14px 0 0;">If you did not start this signup, you can ignore this email.</p>`
  });

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.user}>`,
    to,
    subject: 'Your signup verification code',
    html: shell.html,
    text: `Hello ${name}, your Buyer Trend Lens verification code is ${otp}. It expires in ${expiresInMinutes} minutes.`,
    attachments: shell.attachments
  });
};

module.exports = {
  getSmtpConfig,
  createTransporter,
  sendContactEmail,
  sendPaymentStatusEmail,
  sendSignupOtpEmail
};
