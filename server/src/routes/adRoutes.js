import { Router } from "express";
import {
  approveAdvertisement,
  createAdvertisement,
  createAdvertisementRequest,
  getAdvertisementFormOptions,
  deleteAdvertisement,
  getAllAdvertisements,
  getActiveAdvertisements,
  rejectAdvertisement,
  updateAdvertisement,
  verifyAdvertisementPayment,
} from "../controllers/adController.js";
import { authorize, protect } from "../middlewares/auth.js";
import { roles } from "../utils/constants.js";

const router = Router();

router.get("/form-options", getAdvertisementFormOptions);
router.get("/active", getActiveAdvertisements);
router.post("/request", createAdvertisementRequest);
router.post("/:id/verify-payment", verifyAdvertisementPayment);
router.get("/", protect, authorize(roles.SUPER_ADMIN), getAllAdvertisements);
router.post("/", protect, authorize(roles.SUPER_ADMIN), createAdvertisement);
router.patch("/:id", protect, authorize(roles.SUPER_ADMIN), updateAdvertisement);
router.patch("/:id/approve", protect, authorize(roles.SUPER_ADMIN), approveAdvertisement);
router.patch("/:id/reject", protect, authorize(roles.SUPER_ADMIN), rejectAdvertisement);
router.delete("/:id", protect, authorize(roles.SUPER_ADMIN), deleteAdvertisement);

export default router;
