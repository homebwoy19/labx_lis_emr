import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import hpp from "hpp";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";

import { config } from "./config/index.js";
import { logger } from "./core/logger.js";
import { requestContext } from "./middlewares/requestContext.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/notFound.js";
import { apiLimiter } from "./middlewares/rateLimit.js";
import v1Router from "./routes/v1.js";
import swaggerSpec from "./docs/swagger.js";

/**
 * Express application factory.
 *
 * The middleware order is deliberate and security-first:
 *   1. trust proxy        — correct client IPs behind Render/Railway/NGINX
 *   2. helmet             — secure HTTP headers
 *   3. cors               — locked to configured origins, credentials on
 *   4. body parsers       — JSON/urlencoded with a hard size cap
 *   5. cookie-parser      — needed for the HttpOnly refresh cookie
 *   6. compression        — response gzip
 *   7. hpp                — HTTP parameter pollution guard
 *   8. requestContext     — request id + client metadata for logs/audit
 *   9. http logger        — structured per-request logging
 *  10. rate limiter       — global throttle
 *  11. routes / docs
 *  12. notFound → errorHandler (terminal)
 */
export function createApp() {
  const app = express();

  // Behind a reverse proxy in production; needed for correct req.ip + secure cookies.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    }),
  );

  app.use(express.json({ limit: `${config.uploads.maxSizeMb}mb` }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());
  app.use(compression());
  app.use(hpp());

  app.use(requestContext);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      // Requests are already logged with context; keep noise down on health checks.
      autoLogging: { ignore: (req) => req.url === `${config.apiPrefix}/health` },
    }),
  );

  app.use(apiLimiter);

  // API documentation.
  app.use(`${config.apiPrefix}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get(`${config.apiPrefix}/docs.json`, (_req, res) => res.json(swaggerSpec));

  // Versioned API.
  app.use(config.apiPrefix, v1Router);

  // Root liveness probe.
  app.get("/", (_req, res) =>
    res.json({ success: true, message: `${config.appName} API`, data: { docs: `${config.apiPrefix}/docs` } }),
  );

  // Terminal handlers.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
