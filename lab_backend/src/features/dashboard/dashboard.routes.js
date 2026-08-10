import { Router } from "express";
import * as controller from "./dashboard.controller.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { tenantScope } from "../../middlewares/tenantScope.js";
import { PERMISSIONS as P } from "../../constants/permissions.js";

/**
 * Dashboard routes — mounted at /api/v1/dashboard.
 *
 * A single GET returning role-scoped live data. Not behind the subscription
 * guard so a lapsed lab admin can still see their dashboard (including
 * subscription status and renewal prompts).
 */
const router = Router();

router.use(authenticate, tenantScope);

router.get("/", authorize(P.DASHBOARD_READ), controller.get);

export default router;
