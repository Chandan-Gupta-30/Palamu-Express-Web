import { Router } from "express";
import { getDashboardOverview, getPendingApprovals, getDashboardPayload, updateGlobalSettings } from "../controllers/adminController.js";
import { authorize, protect } from "../middlewares/auth.js";
import { roles } from "../utils/constants.js";

const router = Router();

router.get("/overview", protect, authorize(roles.SUPER_ADMIN, roles.CHIEF_EDITOR), getDashboardOverview);
router.get("/pending-approvals", protect, authorize(roles.SUPER_ADMIN), getPendingApprovals);
router.get("/dashboard-payload", protect, authorize(roles.SUPER_ADMIN, roles.CHIEF_EDITOR, roles.REPORTER), getDashboardPayload);
router.patch("/settings", protect, authorize(roles.SUPER_ADMIN), updateGlobalSettings);

export default router;
