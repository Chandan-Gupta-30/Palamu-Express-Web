import { Router } from "express";
import {
  approveUser,
  deleteUserByAdmin,
  getStaffCard,
  getMe,
  getUsers,
  rejectUser,
  toggleBookmark,
  updateMyCredentials,
  updateUserByAdmin,
} from "../controllers/userController.js";
import { authorize, protect } from "../middlewares/auth.js";
import { roles } from "../utils/constants.js";

const router = Router();

router.get("/me", protect, getMe);
router.patch("/me/credentials", protect, updateMyCredentials);
router.get("/id-card", protect, authorize(roles.REPORTER, roles.CHIEF_EDITOR), getStaffCard);
router.patch("/bookmarks/:articleId", protect, toggleBookmark);
router.get("/", protect, authorize(roles.SUPER_ADMIN, roles.CHIEF_EDITOR), getUsers);
router.patch("/:id/approve", protect, authorize(roles.SUPER_ADMIN), approveUser);
router.patch("/:id/reject", protect, authorize(roles.SUPER_ADMIN), rejectUser);
router.patch("/:id", protect, authorize(roles.SUPER_ADMIN), updateUserByAdmin);
router.delete("/:id", protect, authorize(roles.SUPER_ADMIN), deleteUserByAdmin);

export default router;
