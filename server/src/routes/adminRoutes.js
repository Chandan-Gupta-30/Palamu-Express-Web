import { Router } from "express";
import { getDashboardOverview, getPendingApprovals } from "../controllers/adminController.js";
import { authorize, protect } from "../middlewares/auth.js";
import { roles } from "../utils/constants.js";

const router = Router();

router.get("/overview", protect, authorize(roles.SUPER_ADMIN, roles.CHIEF_EDITOR), getDashboardOverview);
router.get("/pending-approvals", protect, authorize(roles.SUPER_ADMIN), getPendingApprovals);

export default router;
