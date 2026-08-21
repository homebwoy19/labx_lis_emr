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

/**
 * Whether a real SMTP transport is configured. When false, sendMail logs the
 * message (including any attachment names) instead of delivering it, so callers
 * can tell the user "sent" vs "logged only (email not configured)".
 */
export function mailEnabled() {
  return Boolean(config.mail.host && config.mail.user);
}

function getTransporter() {
  if (transporter) return transporter;

  if (mailEnabled()) {
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
          {
            to: msg.to,
            subject: msg.subject,
            text: msg.text,
            attachments: (msg.attachments || []).map((a) => a.filename || "attachment"),
          },
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
 *
 * `attachments` (optional) is passed straight through to Nodemailer, e.g.
 * `[{ filename: "report.pdf", content: <Buffer>, contentType: "application/pdf" }]`.
 * Returns `true` when the transport accepted the message, `false` on failure, so
 * callers that need to know (e.g. "report sent") can branch on it.
 */
export async function sendMail({ to, subject, text, html, attachments }) {
  try {
    await getTransporter().sendMail({
      from: config.mail.from,
      to,
      subject,
      text,
      html,
      ...(attachments ? { attachments } : {}),
    });
    return true;
  } catch (err) {
    logger.error({ err, to, subject }, "failed to send email");
    return false;
  }
}

export default { sendMail, mailEnabled };
