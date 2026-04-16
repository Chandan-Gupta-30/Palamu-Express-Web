import { Router } from "express";
import { getAnalyticsOverview } from "../controllers/analyticsController.js";
import { authorize, protect } from "../middlewares/auth.js";
import { roles } from "../utils/constants.js";

const router = Router();

router.get("/", protect, authorize(roles.SUPER_ADMIN, roles.CHIEF_EDITOR), getAnalyticsOverview);

export default router;

