import { PrismaClient } from "@prisma/client";
import { config } from "../config/index.js";
import { logger } from "./logger.js";

/**
 * Base Prisma client (singleton).
 *
 * A single connection pool is shared across the process. In development we
 * guard against hot-reload creating multiple clients by stashing it on
 * globalThis.
 *
 * NOTE: This base client is UNSCOPED. Application code should almost never use
 * it directly for tenant data — use `forTenant(context)` (see tenantClient.js)
 * so organizationId / branchId filters are applied automatically. The base
 * client is used for auth (looking up users by email before a tenant context
 * exists) and by the Super Admin platform layer.
 */
const createClient = () =>
  new PrismaClient({
    log: config.isDev
      ? [
          { level: "warn", emit: "event" },
          { level: "error", emit: "event" },
        ]
      : [{ level: "error", emit: "event" }],
  });

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.__prisma ?? createClient();

if (!config.isProd) globalForPrisma.__prisma = prisma;

prisma.$on?.("warn", (e) => logger.warn({ prisma: e }, "prisma warning"));
prisma.$on?.("error", (e) => logger.error({ prisma: e }, "prisma error"));

export async function connectDatabase() {
  await prisma.$connect();
  logger.info("Database connected");
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info("Database disconnected");
}

export default prisma;
