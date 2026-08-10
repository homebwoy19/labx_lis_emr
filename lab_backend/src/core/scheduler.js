import { config } from "../config/index.js";
import { logger } from "./logger.js";
import { prisma } from "./prisma.js";
import { resolveStatus, daysUntil, msUntil } from "../features/subscriptions/subscription.util.js";
import { createNotification } from "../features/notifications/notification.service.js";

/**
 * Background scheduler — subscription expiration scanner.
 *
 * Scans all subscriptions at a configurable interval and emits reminder
 * notifications when subscriptions are approaching expiration. Notifications
 * are deduplicated via `dedupeKey` on the Notification model so running the
 * scan multiple times within the same period never produces duplicates.
 *
 * Driver selection (config.scheduler.driver):
 *   "bullmq"   — BullMQ repeatable job via Redis. Best for production.
 *   "interval"  — setInterval in-process. Good for development / no Redis.
 *   "auto"      — tries BullMQ first, falls back to interval.
 *
 * The scheduler is started after the HTTP server boots (server.js) and only
 * when config.scheduler.enabled is true.
 */

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/**
 * Starts the background scheduler. Called from server.js.
 */
export async function startScheduler() {
  if (!config.scheduler.enabled) {
    logger.info("scheduler disabled (SCHEDULER_ENABLED=false)");
    return;
  }

  const driver = config.scheduler.driver;
  const intervalMs = config.scheduler.scanIntervalMinutes * 60 * 1000;

  if (driver === "bullmq" || driver === "auto") {
    try {
      const started = await startBullMQ(intervalMs);
      if (started) return;
      if (driver === "bullmq") {
        logger.error("scheduler: BullMQ requested but failed to start");
        return;
      }
      // auto → fall through to interval
    } catch (err) {
      if (driver === "bullmq") {
        logger.error({ err }, "scheduler: BullMQ failed");
        return;
      }
      logger.warn({ err }, "scheduler: BullMQ unavailable, falling back to interval");
    }
  }

  // Interval driver
  logger.info({ intervalMs }, "scheduler: starting interval driver");
  // Run once immediately, then on the interval
  runScan().catch((err) => logger.error({ err }, "scheduler: initial scan failed"));
  setInterval(() => {
    runScan().catch((err) => logger.error({ err }, "scheduler: scan failed"));
  }, intervalMs);
}

/**
 * Attempts to start the BullMQ repeatable job. Returns true on success.
 */
async function startBullMQ(intervalMs) {
  // Dynamic import so the module doesn't fail if bullmq isn't installed
  const { Queue, Worker } = await import("bullmq");
  const IORedis = (await import("ioredis")).default;

  const connection = new IORedis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: () => null,
  });

  // Handle error event to prevent unhandled 'error' event crashes when Redis is offline
  connection.on("error", (err) => {
    logger.debug({ err: err.message }, "scheduler: BullMQ redis connection error");
  });

  try {
    // Test the connection
    await connection.connect();
    await connection.ping();
  } catch (err) {
    connection.disconnect();
    throw err;
  }

  const QUEUE_NAME = "subscription-scanner";
  const queue = new Queue(QUEUE_NAME, { connection });

  // Remove any stale repeatable jobs
  const repeatable = await queue.getRepeatableJobs();
  for (const job of repeatable) {
    await queue.removeRepeatableByKey(job.key);
  }

  // Add a repeatable job
  await queue.add(
    "scan",
    {},
    {
      repeat: { every: intervalMs },
      removeOnComplete: { count: 10 },
      removeOnFail: { count: 50 },
    },
  );

  // Worker processes the job
  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      await runScan();
    },
    { connection, concurrency: 1 },
  );

  worker.on("failed", (job, err) => {
    logger.error({ err, jobId: job?.id }, "scheduler: BullMQ job failed");
  });

  logger.info({ intervalMs, driver: "bullmq" }, "scheduler: BullMQ driver started");
  return true;
}

// ---------------------------------------------------------------------------
// Scan logic
// ---------------------------------------------------------------------------

/**
 * The core scan that runs on every tick. Loads all subscriptions, computes
 * their live status, and sends reminder notifications where appropriate.
 */
async function runScan() {
  const now = new Date();
  logger.debug("scheduler: running subscription scan");

  const subscriptions = await prisma.subscription.findMany({
    select: {
      id: true,
      organizationId: true,
      plan: true,
      billingCycle: true,
      status: true,
      amount: true,
      currentPeriodEnd: true,
      gracePeriodDays: true,
      organization: {
        select: { id: true, name: true },
      },
    },
  });

  let reminders = 0;
  for (const sub of subscriptions) {
    if (!sub.currentPeriodEnd) continue;

    const liveStatus = resolveStatus(sub, now);
    // Only process subscriptions that are still live (ACTIVE or EXPIRING_SOON)
    if (!["ACTIVE", "EXPIRING_SOON"].includes(liveStatus)) continue;

    const daysLeft = daysUntil(sub.currentPeriodEnd, now);
    const msLeft = msUntil(sub.currentPeriodEnd, now);
    const periodEndStr = sub.currentPeriodEnd.toISOString().slice(0, 10);

    if (sub.billingCycle === "MONTHLY") {
      // 1 day before → notify lab admin
      if (daysLeft <= 1 && daysLeft > 0) {
        await notifyLabAdmins(sub, {
          type: "SUBSCRIPTION_EXPIRING",
          title: "Subscription Expiring Tomorrow",
          body: `Your ${sub.plan} subscription expires tomorrow (${periodEndStr}). Please contact your administrator to renew.`,
          dedupeKey: `sub_monthly_1d_${sub.id}_${periodEndStr}`,
        });
        reminders++;
      }
      // 12 hours before → notify super admin
      if (msLeft <= TWELVE_HOURS_MS && msLeft > 0) {
        await notifySuperAdmins(sub, {
          type: "SUBSCRIPTION_RENEWAL_PROMPT",
          title: `Subscription Expiring: ${sub.organization.name}`,
          body: `The monthly ${sub.plan} subscription for ${sub.organization.name} expires within 12 hours (${periodEndStr}). Has this laboratory renewed?`,
          dedupeKey: `sub_monthly_12h_${sub.id}_${periodEndStr}`,
        });
        reminders++;
      }
    } else if (sub.billingCycle === "ANNUAL") {
      // 7 days before → notify lab admin
      if (daysLeft <= 7 && daysLeft > 1) {
        await notifyLabAdmins(sub, {
          type: "SUBSCRIPTION_EXPIRING",
          title: "Subscription Expiring in 7 Days",
          body: `Your ${sub.plan} annual subscription expires on ${periodEndStr}. Please contact your administrator to arrange renewal.`,
          dedupeKey: `sub_annual_7d_${sub.id}_${periodEndStr}`,
        });
        reminders++;
      }
      // 12 hours before → notify super admin
      if (msLeft <= TWELVE_HOURS_MS && msLeft > 0) {
        await notifySuperAdmins(sub, {
          type: "SUBSCRIPTION_RENEWAL_PROMPT",
          title: `Subscription Expiring: ${sub.organization.name}`,
          body: `The annual ${sub.plan} subscription for ${sub.organization.name} expires within 12 hours (${periodEndStr}). Has this laboratory renewed?`,
          dedupeKey: `sub_annual_12h_${sub.id}_${periodEndStr}`,
        });
        reminders++;
      }
    }
  }

  if (reminders > 0) {
    logger.info({ reminders }, "scheduler: subscription reminders sent");
  }
}

/**
 * Sends a notification to all LAB_ADMIN users for the subscription's org.
 * dedupeKey guarantees no duplicates across repeated scans.
 */
async function notifyLabAdmins(sub, { type, title, body, dedupeKey }) {
  const admins = await prisma.user.findMany({
    where: {
      organizationId: sub.organizationId,
      deletedAt: null,
      status: "ACTIVE",
      roles: {
        some: {
          role: { scope: "ORGANIZATION" },
        },
      },
    },
    select: { id: true },
  });

  for (const admin of admins) {
    await createNotification({
      userId: admin.id,
      organizationId: sub.organizationId,
      type,
      title,
      body,
      data: { subscriptionId: sub.id, plan: sub.plan, periodEnd: sub.currentPeriodEnd },
      dedupeKey: `${dedupeKey}_${admin.id}`,
    });
  }
}

/**
 * Sends a notification to all Super Admin (PLATFORM scope) users.
 */
async function notifySuperAdmins(sub, { type, title, body, dedupeKey }) {
  const superAdmins = await prisma.user.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      roles: {
        some: {
          role: { scope: "PLATFORM" },
        },
      },
    },
    select: { id: true },
  });

  for (const sa of superAdmins) {
    await createNotification({
      userId: sa.id,
      organizationId: sub.organizationId,
      type,
      title,
      body,
      data: { subscriptionId: sub.id, organizationId: sub.organizationId, orgName: sub.organization.name, plan: sub.plan, periodEnd: sub.currentPeriodEnd },
      dedupeKey: `${dedupeKey}_${sa.id}`,
    });
  }
}

export default { startScheduler };
