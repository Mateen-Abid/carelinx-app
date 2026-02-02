import nodemailer from 'nodemailer';

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const fromEmail = process.env.SMTP_FROM || user;
  const fromName = process.env.SMTP_FROM_NAME || 'CareLinx';

  if (!host || !user || !pass || !fromEmail) {
    return null;
  }

  return { host, port, user, pass, secure, fromEmail, fromName };
};

export const sendEmail = async ({ to, subject, html, text }: EmailPayload) => {
  const config = getSmtpConfig();
  if (!config) {
    console.warn('⚠️ SMTP not configured. Skipping email send.');
    return { sent: false, error: 'SMTP not configured' };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromEmail}>`,
    to,
    subject,
    text,
    html,
  });

  return { sent: true };
};

