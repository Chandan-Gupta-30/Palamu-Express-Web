import { Router } from "express";
import { protect, authorize } from "../middlewares/auth.js";
import {
  getNotifications,
  markRead,
  markAllRead,
  clearNotification,
  clearAllNotifications,
  adminSendNotification,
  adminGetAllNotifications,
  adminDeleteNotification,
  adminDeleteAllNotifications,
} from "../controllers/notificationController.js";

const router = Router();

// Staff (Reporter/Chief Editor/Admin) User Routes
router.get("/", protect, getNotifications);
router.patch("/:id/read", protect, markRead);
router.post("/mark-all-read", protect, markAllRead);
router.delete("/:id/clear", protect, clearNotification);
router.post("/clear-all", protect, clearAllNotifications);

// Super Admin Controls Routes
router.post("/admin", protect, authorize("super_admin"), adminSendNotification);
router.get("/admin/all", protect, authorize("super_admin"), adminGetAllNotifications);
router.delete("/admin/:id", protect, authorize("super_admin"), adminDeleteNotification);
router.delete("/admin", protect, authorize("super_admin"), adminDeleteAllNotifications);

export default router;
