import { Router } from "express";
import {
  createAdvertisement,
  deleteAdvertisement,
  getAllAdvertisements,
  getActiveAdvertisements,
  updateAdvertisement,
  verifyAdvertisementPayment,
} from "../controllers/adController.js";
import { authorize, protect } from "../middlewares/auth.js";
import { roles } from "../utils/constants.js";

const router = Router();

router.get("/active", getActiveAdvertisements);
router.get("/", protect, authorize(roles.SUPER_ADMIN), getAllAdvertisements);
router.post("/", protect, authorize(roles.SUPER_ADMIN), createAdvertisement);
router.patch("/:id", protect, authorize(roles.SUPER_ADMIN), updateAdvertisement);
router.delete("/:id", protect, authorize(roles.SUPER_ADMIN), deleteAdvertisement);
router.patch("/:id/verify-payment", protect, authorize(roles.SUPER_ADMIN), verifyAdvertisementPayment);

export default router;
