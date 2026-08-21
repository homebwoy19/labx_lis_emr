import { Router } from "express";
import authRoutes from "../features/auth/auth.routes.js";
import tenantRoutes from "../features/tenants/tenant.routes.js";
import organizationRoutes from "../features/organizations/organization.routes.js";
import branchRoutes from "../features/branches/branch.routes.js";
import userRoutes from "../features/users/user.routes.js";
import patientRoutes from "../features/patients/patient.routes.js";
import catalogRoutes from "../features/catalog/catalog.routes.js";
import orderRoutes from "../features/orders/order.routes.js";
import sampleRoutes from "../features/samples/sample.routes.js";
import resultRoutes from "../features/results/result.routes.js";
import paymentRoutes from "../features/payments/payment.routes.js";
import subscriptionRoutes from "../features/subscriptions/subscription.routes.js";
import dashboardRoutes from "../features/dashboard/dashboard.routes.js";
import notificationRoutes from "../features/notifications/notification.routes.js";
import documentRoutes from "../features/documents/document.routes.js";
import letterheadRoutes from "../features/letterhead/letterhead.routes.js";

/**
 * API v1 router — the single place feature routers are mounted. Adding a feature
 * is a one-line registration here; nothing else in the app needs to change.
 */
const router = Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, message: "ok", data: { service: "lis-api", version: "v1" } });
});

router.use("/auth", authRoutes);
router.use("/tenants", tenantRoutes);
router.use("/organizations", organizationRoutes);
router.use("/branches", branchRoutes);
router.use("/users", userRoutes);
router.use("/patients", patientRoutes);
router.use("/catalog", catalogRoutes);
router.use("/orders", orderRoutes);
router.use("/samples", sampleRoutes);
router.use("/results", resultRoutes);
router.use("/payments", paymentRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/notifications", notificationRoutes);
router.use("/documents", documentRoutes);
router.use("/letterhead", letterheadRoutes);

export default router;

