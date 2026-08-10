import swaggerJsdoc from "swagger-jsdoc";
import { config } from "../config/index.js";

/**
 * OpenAPI specification, assembled from JSDoc @openapi blocks colocated with the
 * route definitions. Served via swagger-ui at {API_PREFIX}/docs.
 */
const spec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: `${config.appName} API`,
      version: "1.0.0",
      description:
        "Cloud-based multi-tenant Laboratory Information System. All endpoints " +
        "return a consistent envelope: { success, message, data, meta }.",
    },
    servers: [{ url: config.apiPrefix }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  // Scan route files for @openapi annotations.
  apis: ["./src/features/**/*.routes.js"],
});

export default spec;
