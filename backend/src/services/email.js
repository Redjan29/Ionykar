import nodemailer from "nodemailer";

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    const err = new Error(`Missing required env var: ${name}`);
    err.status = 500;
    throw err;
  }
  return value;
}

function buildTransport() {
  const host = getRequiredEnv("SMTP_HOST");
  const port = Number(getRequiredEnv("SMTP_PORT"));
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASS");

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for others
    auth: { user, pass },
  });
}

export async function sendEmail({ to, subject, text, html }) {
  const from = process.env.EMAIL_FROM || "no-reply@ionykar.fr";
  const transport = buildTransport();

  await transport.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

