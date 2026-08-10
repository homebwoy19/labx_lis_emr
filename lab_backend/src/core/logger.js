import pino from "pino";
import pinoPretty from "pino-pretty";
import { config } from "../config/index.js";

/**
 * Application logger (Pino).
 *
 * - Pretty-printed in development for readability (direct stream to avoid worker thread crashes).
 * - Structured JSON in production for log aggregation.
 * - Redacts common sensitive fields so secrets never reach the logs.
 */
const prettyStream = config.isDev
  ? pinoPretty({ colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" })
  : undefined;

export const logger = pino(
  {
    level: config.isProd ? "info" : config.isTest ? "silent" : "debug",
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "*.password",
        "*.passwordHash",
        "*.token",
        "*.refreshToken",
        "*.accessToken",
      ],
      censor: "[REDACTED]",
    },
  },
  prettyStream,
);

export default logger;
