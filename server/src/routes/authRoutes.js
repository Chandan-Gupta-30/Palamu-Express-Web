import { Router } from "express";
import { body } from "express-validator";
import { login, register, seedSuperAdmin, verifyPhoneOtp } from "../controllers/authController.js";
import { validate } from "../middlewares/validate.js";

const router = Router();

router.post(
  "/register",
  [
    body("fullName").notEmpty(),
    body("phone").isLength({ min: 10 }),
    body("password").isLength({ min: 6 }),
    body("role").notEmpty(),
    body("email").optional({ values: "falsy" }).isEmail(),
  ],
  validate,
  register
);
router.post("/login", [body("phone").notEmpty(), body("password").notEmpty()], validate, login);
router.patch("/verify-phone/:userId", [body("otp").isLength({ min: 6, max: 6 })], validate, verifyPhoneOtp);
router.post("/seed-super-admin", seedSuperAdmin);

export default router;
