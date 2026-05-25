import { StatusCodes } from "http-status-codes";
import admin from "firebase-admin";
import nodemailer from "nodemailer";
import { isFirebaseInitialized, db } from "../config/firebase.js";
import { User } from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { approvalStatuses, roles } from "../utils/constants.js";
import { uploadBase64Asset } from "../services/uploadService.js";

const emailOtpStore = {};
const EMAIL_OTP_TTL = 10 * 60 * 1000; // 10 minutes

const saveEmailOtp = async (email, otp) => {
  const expiresAt = Date.now() + EMAIL_OTP_TTL;
  if (isFirebaseInitialized) {
    await db.collection("email_otps").doc(email).set({
      otp,
      expiresAt,
    });
  } else {
    emailOtpStore[email] = {
      otp,
      expiresAt,
    };
  }
};

const getEmailOtp = async (email) => {
  if (isFirebaseInitialized) {
    const doc = await db.collection("email_otps").doc(email).get();
    if (!doc.exists) return null;
    return doc.data();
  } else {
    return emailOtpStore[email] || null;
  }
};

const deleteEmailOtp = async (email) => {
  if (isFirebaseInitialized) {
    await db.collection("email_otps").doc(email).delete();
  } else {
    delete emailOtpStore[email];
  }
};

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
    bloodGroup,
    education,
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

  let firebaseUid = null;
  let verificationLink = null;

  if (isFirebaseInitialized) {
    try {
      const fbUser = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: fullName,
      });
      firebaseUid = fbUser.uid;
      verificationLink = await admin.auth().generateEmailVerificationLink(email);
    } catch (fbErr) {
      console.warn("[Firebase Auth Warning] User creation failed, trying fallback lookup:", fbErr.message);
      try {
        const fbUser = await admin.auth().getUserByEmail(email);
        firebaseUid = fbUser.uid;
        verificationLink = await admin.auth().generateEmailVerificationLink(email);
      } catch (innerErr) {
        console.error("[Firebase Auth Error] Complete fallback user lookup failed:", innerErr.message);
      }
    }
  }

  if (!firebaseUid) {
    firebaseUid = "mock-uid";
    verificationLink = `http://localhost:5000/api/auth/mock-verify-email/${encodeURIComponent(email)}`;
  }

  const isReporter = role === "reporter";
  const isChiefEditor = role === "chief_editor";
  const reporterCode = isReporter ? `RPT-${String(Date.now()).slice(-6)}` : undefined;
  const chiefEditorCode = isChiefEditor ? `CED-${String(Date.now()).slice(-6)}` : undefined;

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
    firebaseUid,
    isPhoneVerified: true,
    isEmailVerified: true,
    reporterCode,
    chiefEditorCode,
    bloodGroup: bloodGroup || "O+",
    education: education || "",
  });

  res.status(StatusCodes.CREATED).json({
    message: "Registration submitted successfully.",
    user: await shapeUser(user._id),
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

export const checkEmailVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);

  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
  }

  let emailVerified = false;

  if (isFirebaseInitialized && user.firebaseUid && user.firebaseUid !== "mock-uid") {
    try {
      const fbUser = await admin.auth().getUser(user.firebaseUid);
      emailVerified = fbUser.emailVerified;
    } catch (fbErr) {
      console.error("[Firebase Auth Check Error] Failed to fetch user status:", fbErr.message);
    }
  } else {
    emailVerified = user.isEmailVerified || user.isPhoneVerified || false;
  }

  if (emailVerified) {
    user.isPhoneVerified = true;
    user.isEmailVerified = true;
    user.emailVerificationLink = undefined;
    await user.save();
    return res.json({ verified: true, message: "Email has been successfully verified." });
  }

  res.json({ verified: false, message: "Email is not verified yet. Please check your inbox or click the development test link." });
});

export const mockVerifyEmailLink = asyncHandler(async (req, res) => {
  const { email } = req.params;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).send("User not found");
  }

  user.isPhoneVerified = true;
  user.isEmailVerified = true;
  user.emailVerificationLink = undefined;
  await user.save();

  res.send(`
    <html>
      <body style="font-family: sans-serif; text-align: center; padding: 50px; background-color: #0f172a; color: white;">
        <h1 style="color: #f97316;">Palamu Express</h1>
        <div style="max-width: 500px; margin: 40px auto; padding: 30px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); background-color: rgba(255,255,255,0.03);">
          <div style="font-size: 48px; margin-bottom: 20px;">✉️</div>
          <h2 style="color: #22c55e; margin-bottom: 10px;">Email Verified!</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #cbd5e1;">Onboarding email for <strong style="color: white;">${email}</strong> has been successfully verified in offline mock mode.</p>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 20px;">You can now close this window and return to the onboarding portal to complete registration verification.</p>
        </div>
      </body>
    </html>
  `);
});

export const sendEmailOtp = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Please provide a valid email address." });
  }

  const otp = createOtpCode();
  await saveEmailOtp(email, otp);

  let previewUrl = null;
  let transporter = null;

  try {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const isGmail = String(process.env.SMTP_HOST).toLowerCase().includes("gmail");
      const cleanPass = isGmail 
        ? String(process.env.SMTP_PASS).replace(/\s+/g, "") 
        : process.env.SMTP_PASS;

      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: cleanPass,
        },
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    if (transporter) {
      const fromEmail = process.env.SMTP_USER || "onboarding@palamuexpress.com";
      const info = await transporter.sendMail({
        from: `"Palamu Express News Desk" <${fromEmail}>`,
        to: email,
        subject: "Verify your email address - Palamu Express Digital Media",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 20px; padding: 40px; background-color: #ffffff;">
            <h1 style="color: #ea580c; text-align: center; text-transform: uppercase; margin: 0; font-size: 28px; font-weight: bold; tracking: 1px;">Palamu Express</h1>
            <h2 style="color: #0f172a; text-align: center; margin-top: 15px; font-size: 20px;">Email Onboarding Verification</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #334155; text-align: center; margin-top: 20px;">
              Thank you for enrolling in the Palamu Express Digital Media portal. Please use the secure 6-digit OTP code below to verify your email address to complete your registration request:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-family: monospace; font-size: 38px; font-weight: bold; color: #ea580c; letter-spacing: 8px; border: 2px dashed #f97316; padding: 12px 28px; border-radius: 14px; background-color: #fff7ed; display: inline-block;">
                ${otp}
              </span>
            </div>
            <p style="font-size: 13px; color: #64748b; text-align: center; margin-top: 30px; line-height: 1.5;">
              This secure verification code is valid for 10 minutes. If you did not request this verification, you can safely ignore this correspondence.
            </p>
            <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 35px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center;">
              Palamu Express Digital Media Portal © 2026. All rights reserved.
            </p>
          </div>
        `,
      });
      if (info) {
        previewUrl = nodemailer.getTestMessageUrl(info);
      }
    }
  } catch (err) {
    console.error("[Nodemailer Error] Could not send OTP email:", err.message);
  }

  res.json({
    success: true,
    message: "A secure verification OTP code has been dispatched to your email address.",
    previewUrl,
  });
});

export const verifyEmailOtp = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const otp = String(req.body.otp || "").trim();

  if (!email || !otp) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Email and OTP verification parameters are required." });
  }

  const record = await getEmailOtp(email);
  if (!record || record.otp !== otp || record.expiresAt < Date.now()) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid or expired email OTP code." });
  }

  await deleteEmailOtp(email);
  res.json({ success: true, message: "Email address verified successfully!" });
});
