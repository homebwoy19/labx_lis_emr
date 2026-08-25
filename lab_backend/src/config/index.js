import "dotenv/config";
import { z } from "zod";

/**
 * Environment variable schema.
 *
 * Fail-fast principle: the process must refuse to boot with an invalid or
 * incomplete configuration rather than crash unpredictably at runtime.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "staging", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default("/api/v1"),
  APP_NAME: z.string().default("Foundation Lab LIS"),
  PLATFORM_DOMAIN: z
    .string()
    .default("labx.com.ng")
    .transform((value) => value.trim().toLowerCase()),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((val) =>
      val
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    ),

  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // JWT / Auth
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be >= 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be >= 32 chars"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),
  SESSION_IDLE_TIMEOUT_MIN: z.coerce.number().int().positive().default(30),
  MAX_ACTIVE_DEVICES: z.coerce.number().int().positive().default(2),
  MAX_LOGIN_ATTEMPTS: z.coerce.number().int().positive().default(5),
  LOCKOUT_DURATION_MIN: z.coerce.number().int().positive().default(15),
  COOKIE_DOMAIN: z.string().default("localhost"),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  // SameSite policy for the refresh cookie. Use "none" when the frontend and API
  // live on different sites (e.g. Vercel + a separate API domain) — the browser
  // only sends a cross-site cookie when SameSite=None AND Secure. Keep "strict"
  // (or "lax") for same-site/local development.
  COOKIE_SAMESITE: z.enum(["strict", "lax", "none"]).default("strict"),

  // Redis
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Background scheduler (subscription expiration reminders / status transitions)
  SCHEDULER_ENABLED: z.coerce.boolean().default(true),
  SCHEDULER_DRIVER: z.enum(["auto", "bullmq", "interval"]).default("auto"),
  SUBSCRIPTION_SCAN_INTERVAL_MINUTES: z.coerce.number().int().positive().default(60),

  // Supabase Storage
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("lab-documents"),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().default("Foundation Lab <no-reply@foundationlab.com>"),

  // Uploads
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(15),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Use console here directly — the logger depends on config, which isn't ready yet.
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:");
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

export const config = {
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",
  isDev: env.NODE_ENV === "development",
  port: env.PORT,
  apiPrefix: env.API_PREFIX,
  appName: env.APP_NAME,
  platformDomain: env.PLATFORM_DOMAIN,
  corsOrigins: env.CORS_ORIGINS,

  db: {
    url: env.DATABASE_URL,
    directUrl: env.DIRECT_URL,
  },

  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessTtl: env.JWT_ACCESS_TTL,
    refreshTtl: env.JWT_REFRESH_TTL,
  },

  auth: {
    sessionIdleTimeoutMin: env.SESSION_IDLE_TIMEOUT_MIN,
    maxActiveDevices: env.MAX_ACTIVE_DEVICES,
    maxLoginAttempts: env.MAX_LOGIN_ATTEMPTS,
    lockoutDurationMin: env.LOCKOUT_DURATION_MIN,
  },

  cookie: {
    domain: env.COOKIE_DOMAIN,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
  },

  redis: {
    url: env.REDIS_URL,
  },

  scheduler: {
    enabled: env.SCHEDULER_ENABLED,
    driver: env.SCHEDULER_DRIVER,
    scanIntervalMinutes: env.SUBSCRIPTION_SCAN_INTERVAL_MINUTES,
  },

  supabase: {
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    bucket: env.SUPABASE_STORAGE_BUCKET,
  },

  mail: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    from: env.MAIL_FROM,
  },

  uploads: {
    maxSizeMb: env.MAX_UPLOAD_SIZE_MB,
    maxSizeBytes: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
  },
};

export default config;
