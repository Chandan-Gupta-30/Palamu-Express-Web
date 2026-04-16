import { StatusCodes } from "http-status-codes";
import { User } from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { approvalStatuses, roles } from "../utils/constants.js";
import { uploadBase64Asset } from "../services/uploadService.js";

const createOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

const shapeUser = async (userId) => User.findById(userId).select("-password");

export const register = asyncHandler(async (req, res) => {
  const {
    fullName,
    email,
    phone,
    password,
    aadhaarNumber,
    district,
    area,
    role,
    profilePhotoUrl,
    aadhaarImageUrl,
    livePhotoUrl,
  } = req.body;

  if ([roles.REPORTER, roles.CHIEF_EDITOR].includes(role) && (!district || !area || !aadhaarNumber)) {
    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      message: "District, area, and Aadhaar number are required for reporter and chief editor onboarding",
    });
  }

  if (role === roles.REPORTER && (!profilePhotoUrl || !aadhaarImageUrl)) {
    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      message: "Reporter onboarding requires profile photo and Aadhaar image",
    });
  }

  if (role === roles.CHIEF_EDITOR && !livePhotoUrl) {
    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      message: "Chief editor onboarding requires a live captured photo",
    });
  }

  const otpCode = createOtpCode();
  const [storedProfilePhotoUrl, storedAadhaarImageUrl, storedLivePhotoUrl] = await Promise.all([
    uploadBase64Asset(profilePhotoUrl, "palamu-express/profile"),
    uploadBase64Asset(aadhaarImageUrl, "palamu-express/aadhaar"),
    uploadBase64Asset(livePhotoUrl, "palamu-express/live-photo"),
  ]);

  const user = await User.create({
    fullName,
    email,
    phone,
    password,
    aadhaarNumber,
    district,
    area,
    role,
    profilePhotoUrl: storedProfilePhotoUrl,
    aadhaarImageUrl: storedAadhaarImageUrl,
    livePhotoUrl: storedLivePhotoUrl,
    phoneOtpCode: otpCode,
    phoneOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  res.status(StatusCodes.CREATED).json({
    message: "Registration submitted. Verify OTP to complete phone verification.",
    user: await shapeUser(user._id),
    developmentOtp: otpCode,
  });
});

export const login = asyncHandler(async (req, res) => {
  const phone = String(req.body.phone || "").trim();
  const password = String(req.body.password || "");
  const user = await User.findOne({ phone }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid credentials" });
  }

  const token = signToken({ id: user._id, role: user.role });
  res.json({ token, user: await User.findById(user._id).select("-password") });
});

export const verifyPhoneOtp = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const user = await User.findById(req.params.userId).select("+phoneOtpCode +phoneOtpExpiresAt");

  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
  }

  const isValidOtp = user.phoneOtpCode && user.phoneOtpCode === otp;
  const isExpired = !user.phoneOtpExpiresAt || user.phoneOtpExpiresAt.getTime() < Date.now();

  if (!isValidOtp || isExpired) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid or expired OTP" });
  }

  user.isPhoneVerified = true;
  user.phoneOtpCode = undefined;
  user.phoneOtpExpiresAt = undefined;
  await user.save();

  res.json({ message: "Phone verified successfully", user: await shapeUser(user._id) });
});

export const seedSuperAdmin = asyncHandler(async (req, res) => {
  const existing = await User.findOne({ role: roles.SUPER_ADMIN });
  if (existing) {
    return res.json({ message: "Super admin already exists" });
  }

  const admin = await User.create({
    fullName: "Platform Super Admin",
    phone: "9999999999",
    password: "admin123",
    role: roles.SUPER_ADMIN,
    approvalStatus: approvalStatuses.APPROVED,
    isPhoneVerified: true,
  });

  res.status(StatusCodes.CREATED).json({
    message: "Super admin seeded",
    user: await User.findById(admin._id).select("-password"),
  });
});
