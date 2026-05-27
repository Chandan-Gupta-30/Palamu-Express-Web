import { Router } from "express";
import {
  createContactMessage,
  deleteContactMessage,
  getContactMessages,
  updateContactMessage,
  getMyQueries,
  clearAllContactMessages,
} from "../controllers/contactController.js";
import { authorize, protect } from "../middlewares/auth.js";
import { roles } from "../utils/constants.js";

const router = Router();

router.post("/", createContactMessage);
router.get("/my-queries", protect, getMyQueries);
router.post("/clear-all", protect, authorize(roles.SUPER_ADMIN), clearAllContactMessages);
router.get("/", protect, authorize(roles.SUPER_ADMIN), getContactMessages);
router.patch("/:id", protect, authorize(roles.SUPER_ADMIN), updateContactMessage);
router.delete("/:id", protect, authorize(roles.SUPER_ADMIN), deleteContactMessage);

export default router;
