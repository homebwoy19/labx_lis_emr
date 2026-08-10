import nodemailer from "nodemailer";
import { config } from "../config/index.js";
import { logger } from "./logger.js";

/**
 * Mail transport.
 *
 * When SMTP is configured we build a real Nodemailer transport. When it is NOT
 * configured (local dev / placeholder credentials), we fall back to a "log
 * transport" that writes the message to the logger instead of sending — so the
 * app runs end-to-end without a mail server and developers can copy reset links
 * straight from the logs.
 */
let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (config.mail.host && config.mail.user) {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: { user: config.mail.user, pass: config.mail.password },
    });
  } else {
    // Dev/no-SMTP fallback — logs instead of sending.
    transporter = {
      sendMail: async (msg) => {
        logger.info(
          { to: msg.to, subject: msg.subject, text: msg.text },
          "[mailer:stub] email not sent (SMTP not configured)",
        );
        return { messageId: "stub" };
      },
    };
  }
  return transporter;
}

/**
 * Sends an email. Never throws into the caller's critical path — mail failures
 * are logged and swallowed so, e.g., a password-reset request still returns
 * success even if the mail server hiccups.
 */
export async function sendMail({ to, subject, text, html }) {
  try {
    await getTransporter().sendMail({
      from: config.mail.from,
      to,
      subject,
      text,
      html,
    });
  } catch (err) {
    logger.error({ err, to, subject }, "failed to send email");
  }
}

export default { sendMail };
