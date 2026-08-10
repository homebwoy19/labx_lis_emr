import { createApp } from "./app.js";
import { config } from "./config/index.js";
import { logger } from "./core/logger.js";
import { connectDatabase, disconnectDatabase } from "./core/prisma.js";
import { startScheduler } from "./core/scheduler.js";

/**
 * Server bootstrap.
 *
 * Connects the database first (fail-fast), starts the HTTP server, and wires up
 * graceful shutdown so in-flight requests drain and the DB pool closes cleanly
 * on SIGINT/SIGTERM (important for container orchestration).
 */
async function bootstrap() {
  await connectDatabase();

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(
      { port: config.port, env: config.env, prefix: config.apiPrefix },
      `${config.appName} listening`,
    );
    // Start background subscription scanner after HTTP is ready.
    startScheduler().catch((err) => {
      logger.error({ err }, "failed to start scheduler");
    });
  });

  const shutdown = async (signal) => {
    logger.info({ signal }, "shutting down");
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    // Force-exit if graceful shutdown stalls.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "unhandled promise rejection");
  });
  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "uncaught exception — exiting");
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, "failed to start server");
  process.exit(1);
});
