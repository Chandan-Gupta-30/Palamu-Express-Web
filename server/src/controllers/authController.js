import { StatusCodes } from "http-status-codes";
import admin from "firebase-admin";
import nodemailer from "nodemailer";
import { isFirebaseInitialized, db } from "../config/firebase.js";
import { User } from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { approvalStatuses, roles } from "../utils/constants.js";
import { uploadBase64Asset } from "../services/uploadService.js";
import { sendEmail } from "../utils/mailer.js";

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

  // Ensure unique phone number
  const existingPhone = String(phone || "").trim();
  const existingPhoneUser = await User.findOne({ phone: existingPhone });
  if (existingPhoneUser) {
    return res.status(StatusCodes.CONFLICT).json({
      message: "This mobile phone number is already registered. Please sign in or use another number.",
    });
  }

  // Ensure unique email address
  if (email) {
    const existingEmail = String(email || "").trim().toLowerCase();
    const existingEmailUser = await User.findOne({
      $or: [
        { email: existingEmail },
        { email: String(email || "").trim() }
      ]
    });
    if (existingEmailUser) {
      return res.status(StatusCodes.CONFLICT).json({
        message: "This email address is already registered. Please sign in or use another email.",
      });
    }
  }

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

export const forgotPassword = asyncHandler(async (req, res) => {
  const identifier = String(req.body.identifier || "").trim();

  if (!identifier) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Please provide your email address or mobile number." });
  }

  const user = await User.findOne({
    $or: [
      { email: identifier },
      { email: identifier.toLowerCase() },
      { phone: identifier },
    ],
  });

  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "No account found matching that email or phone number." });
  }

  if (!user.email) {
    return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json({
      message: "This account does not have a registered email address. Please contact the super admin to recover your account.",
    });
  }

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let tempPassword = "PE-";
  for (let i = 0; i < 6; i++) {
    tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  user.password = tempPassword;
  await user.save();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Temporary Password Recovery - Palamu Express</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #05070c;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #cbd5e1;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: linear-gradient(180deg, #090d16 0%, #05070c 100%);
          border: 1px solid rgba(251, 146, 60, 0.15);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }
        .header {
          padding: 30px 20px;
          text-align: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(251, 146, 60, 0.03);
        }
        .logo {
          display: inline-block;
          background-color: #f97316;
          color: #ffffff;
          font-weight: 800;
          font-size: 16px;
          padding: 8px 16px;
          border-radius: 12px;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 8px;
        }
        .header-title {
          font-size: 20px;
          color: #ffffff;
          font-weight: 700;
          margin: 8px 0 0 0;
          letter-spacing: 0.5px;
        }
        .body {
          padding: 40px 30px;
        }
        .welcome {
          font-size: 16px;
          font-weight: 600;
          color: #ffffff;
          margin-top: 0;
          margin-bottom: 16px;
        }
        .paragraph {
          font-size: 14px;
          line-height: 1.6;
          color: #94a3b8;
          margin-top: 0;
          margin-bottom: 24px;
        }
        .credentials-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 28px;
        }
        .credential-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }
        .credential-row:last-child {
          border-bottom: none;
        }
        .credential-label {
          font-size: 13px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }
        .credential-value {
          font-size: 14px;
          color: #f1f5f9;
          font-weight: 600;
        }
        .credential-value.password-value {
          font-family: "Courier New", Courier, monospace;
          color: #f97316;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 1.5px;
        }
        .instructions {
          background: rgba(16, 185, 129, 0.05);
          border-left: 4px solid #10b981;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 28px;
        }
        .instructions-title {
          font-size: 13px;
          font-weight: 700;
          color: #10b981;
          margin-top: 0;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .instructions-list {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.5;
        }
        .instructions-list li {
          margin-bottom: 6px;
        }
        .instructions-list li:last-child {
          margin-bottom: 0;
        }
        .button-wrapper {
          text-align: center;
          margin-bottom: 28px;
        }
        .btn {
          display: inline-block;
          background-color: #f97316;
          color: #ffffff;
          text-decoration: none;
          font-weight: 700;
          font-size: 14px;
          padding: 12px 30px;
          border-radius: 14px;
          box-shadow: 0 10px 20px rgba(249, 115, 22, 0.2);
          transition: background-color 0.2s;
        }
        .btn:hover {
          background-color: #ea580c;
        }
        .footer {
          padding: 30px 20px;
          text-align: center;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(0, 0, 0, 0.2);
        }
        .footer-text {
          font-size: 11px;
          color: #475569;
          margin: 0;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">PE</div>
          <h1 class="header-title">Palamu Express Newsroom</h1>
        </div>
        <div class="body">
          <p class="welcome">Hello, ${user.fullName || "Newsroom Partner"}</p>
          <p class="paragraph">
            We received a request to recover the login credentials for your Palamu Express Digital Media account. 
            A temporary password has been successfully generated and applied to your account.
          </p>
          
          <div class="credentials-card">
            <div class="credential-row">
              <span class="credential-label">Login Identifier</span>
              <span class="credential-value">${user.phone} (Mobile)</span>
            </div>
            <div class="credential-row">
              <span class="credential-label">Temporary Password</span>
              <span class="credential-value password-value">${tempPassword}</span>
            </div>
          </div>
          
          <div class="instructions">
            <h3 class="instructions-title">Next Steps for Access</h3>
            <ol class="instructions-list">
              <li>Open the sign-in portal and enter your 10-digit login mobile number.</li>
              <li>Copy and paste the temporary password: <strong>${tempPassword}</strong>.</li>
              <li>Once logged in, immediately click on <strong>Account Settings</strong> in the sidebar to update your password to a secure personal one.</li>
            </ol>
          </div>
          
          <div class="button-wrapper">
            <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/login" class="btn" target="_blank">Access Newsroom Dashboard</a>
          </div>
        </div>
        <div class="footer">
          <p class="footer-text">
            Palamu Express Digital Media Portal © 2026. All rights reserved.<br>
            If you did not initiate this recovery request, please change your password immediately or contact super admin support.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const emailResult = await sendEmail({
    to: user.email,
    subject: "Your Temporary Login Password - Palamu Express",
    html: htmlContent,
  });

  res.json({
    success: true,
    message: `A temporary recovery password has been dispatched to your registered email address (${user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")}).`,
    previewUrl: emailResult?.previewUrl || null,
  });
});
