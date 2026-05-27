import { StatusCodes } from "http-status-codes";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { approvalStatuses, roles } from "../utils/constants.js";
import { generateStaffCardBuffer } from "../utils/generateReporterCard.js";
import { uploadBase64Asset } from "../services/uploadService.js";
import { sendEmail } from "../utils/mailer.js";
import { env } from "../config/env.js";

const assignStaffIdentityArtifacts = async (user) => {
  if (user.role === roles.REPORTER) {
    if (!user.reporterCode) {
      user.reporterCode = `RPT-${String(Date.now()).slice(-6)}`;
    }
    const pdfBuffer = await generateStaffCardBuffer(user);
    user.idCardUrl = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
    return;
  }

  if (user.role === roles.CHIEF_EDITOR) {
    if (!user.chiefEditorCode) {
      user.chiefEditorCode = `CED-${String(Date.now()).slice(-6)}`;
    }
    const pdfBuffer = await generateStaffCardBuffer(user);
    user.idCardUrl = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
    return;
  }

  user.idCardUrl = undefined;
};

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password").populate("bookmarks", "title slug district area");
  res.json({ user });
});

export const updateMyCredentials = asyncHandler(async (req, res) => {
  const fullName = String(req.body.fullName || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const phone = String(req.body.phone || "").trim();
  const currentPassword = String(req.body.currentPassword || "");
  const newPassword = String(req.body.newPassword || "");

  if (!fullName) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Full name is required" });
  }

  if (!/^\d{10}$/.test(phone)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Phone number must be exactly 10 digits" });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Enter a valid email address" });
  }

  if (newPassword && newPassword.length < 6) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "New password must be at least 6 characters" });
  }

  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
  }

  const conflictingPhoneUser = await User.findOne({
    phone,
    _id: { $ne: user._id },
  });

  if (conflictingPhoneUser) {
    return res.status(StatusCodes.CONFLICT).json({ message: "This phone number is already registered" });
  }

  if (email) {
    const conflictingEmailUser = await User.findOne({
      $or: [
        { email: email },
        { email: email.toLowerCase() }
      ],
      _id: { $ne: user._id },
    });

    if (conflictingEmailUser) {
      return res.status(StatusCodes.CONFLICT).json({ message: "This email is already registered" });
    }
  }

  user.fullName = fullName;
  user.email = email;
  user.phone = phone;

  if (newPassword) {
    if (!currentPassword) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Current password is required to set a new password" });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
  }

  if (user.approvalStatus === approvalStatuses.APPROVED && [roles.REPORTER, roles.CHIEF_EDITOR].includes(user.role)) {
    await assignStaffIdentityArtifacts(user);
  }

  await user.save();

  res.json({
    message: "Account credentials updated",
    user: await User.findById(user._id).select("-password"),
  });
});

export const getUsers = asyncHandler(async (req, res) => {
  const rolesFilter = String(req.query.roles || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const approvalStatus = String(req.query.approvalStatus || "").trim();
  const query = {};

  if (rolesFilter.length) {
    query.role = { $in: rolesFilter };
  }

  if (approvalStatus) {
    query.approvalStatus = approvalStatus;
  }

  const users = await User.find(query).select("-password").sort({ createdAt: -1 });
  res.json({ users });
});

export const approveUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
  }

  user.approvalStatus = approvalStatuses.APPROVED;
  user.rejectionFeedback = "";

  // Automated Expiry: Default to exactly 1 Year from approval date if not set
  if (!user.validUpto) {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    user.validUpto = oneYearFromNow.toISOString().split("T")[0];
  }

  if ([roles.REPORTER, roles.CHIEF_EDITOR].includes(user.role)) {
    await assignStaffIdentityArtifacts(user);
  }

  await user.save();

  // Send premium congratulations email
  const host = req.get("host");
  const protocol = req.protocol;
  const backendUrl = `${protocol}://${host}`;
  const downloadLink = `${backendUrl}/api/users/download-card/${user._id}`;
  const portalLink = `${env.clientUrl}/login`;
  const playStoreLink = "https://play.google.com/store/apps/details?id=com.palamuexpress.app";

  const staffCode = user.role === roles.CHIEF_EDITOR ? user.chiefEditorCode : user.reporterCode;
  const roleLabel = user.role === roles.CHIEF_EDITOR ? "Chief Editor" : "Reporter";

  let formattedValidUpto = user.validUpto;
  if (user.validUpto) {
    try {
      const parts = user.validUpto.split("-");
      if (parts.length === 3) {
        formattedValidUpto = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    } catch (_) {}
  }

  let attachments = [];
  if (user.idCardUrl) {
    const matches = user.idCardUrl.match(/^data:(.+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const base64Data = matches[2];
      attachments.push({
        filename: `Palamu_Express_ID_Card_${staffCode || "Staff"}.pdf`,
        content: Buffer.from(base64Data, "base64"),
        contentType: "application/pdf"
      });
    }
  }

  const emailHtml = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #020617; padding: 45px 20px; color: #f8fafc; border-radius: 24px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(234, 88, 12, 0.2); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
      <!-- Header -->
      <div style="text-align: center; border-bottom: 2px solid #ea580c; padding-bottom: 25px; margin-bottom: 30px;">
        <h1 style="color: #ea580c; font-size: 34px; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 3px; font-family: 'Helvetica Neue', Arial, sans-serif;">PALAMU EXPRESS</h1>
        <p style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 5px; margin: 6px 0 0 0; font-weight: 600;">Digital Media Newsroom</p>
      </div>

      <!-- Hero Message -->
      <div style="text-align: center; margin-bottom: 35px;">
        <span style="background-color: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 8px 20px; border-radius: 9999px; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; display: inline-block;">ONBOARDING APPROVED</span>
        <h2 style="color: #ffffff; font-size: 26px; font-weight: 800; margin: 25px 0 12px 0;">Welcome to the Team, ${user.fullName}!</h2>
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.7; margin: 0; font-weight: 300;">
          We are pleased to inform you that your onboarding credentials and registration documents have been formally approved. You are now officially recognized as a credentialed staff member of Palamu Express Digital Media.
        </p>
      </div>

      <!-- Reporter Info Block -->
      <div style="background: #0f172a; border-radius: 20px; padding: 25px; border: 1px solid rgba(255, 255, 255, 0.05); margin-bottom: 35px;">
        <h3 style="color: #ea580c; font-size: 16px; font-weight: 700; margin: 0 0 18px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); padding-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">Official Registration Details</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #f8fafc;">
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.03);">
            <td style="padding: 10px 0; color: #94a3b8; font-weight: 500; width: 40%;">Full Name:</td>
            <td style="padding: 10px 0; font-weight: 700; color: #ffffff;">${user.fullName}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.03);">
            <td style="padding: 10px 0; color: #94a3b8; font-weight: 500;">Staff Code:</td>
            <td style="padding: 10px 0; font-weight: 700; color: #ea580c; font-family: monospace; font-size: 15px;">${staffCode || "PENDING"}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.03);">
            <td style="padding: 10px 0; color: #94a3b8; font-weight: 500;">Assigned Role:</td>
            <td style="padding: 10px 0; font-weight: 700; color: #ffffff;">${roleLabel}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.03);">
            <td style="padding: 10px 0; color: #94a3b8; font-weight: 500;">District:</td>
            <td style="padding: 10px 0; font-weight: 600;">${user.district || "-"}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.03);">
            <td style="padding: 10px 0; color: #94a3b8; font-weight: 500;">Block/Area:</td>
            <td style="padding: 10px 0; font-weight: 600;">${user.area || "-"}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.03);">
            <td style="padding: 10px 0; color: #94a3b8; font-weight: 500;">Contact Phone:</td>
            <td style="padding: 10px 0; font-weight: 600;">${user.phone || "-"}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.03);">
            <td style="padding: 10px 0; color: #94a3b8; font-weight: 500;">Official Email:</td>
            <td style="padding: 10px 0; font-weight: 600;">${user.email || "-"}</td>
          </tr>
          <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.03);">
            <td style="padding: 10px 0; color: #94a3b8; font-weight: 500;">Valid Upto:</td>
            <td style="padding: 10px 0; font-weight: 700; color: #e2e8f0;">${formattedValidUpto || "-"}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #94a3b8; font-weight: 500;">Blood Group:</td>
            <td style="padding: 10px 0; font-weight: 700; color: #ffffff;">${user.bloodGroup || "O+"}</td>
          </tr>
        </table>
      </div>

      <!-- Action Buttons -->
      <div style="text-align: center; margin-bottom: 35px;">
        <h4 style="color: #ffffff; font-size: 16px; margin: 0 0 20px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Quick Access & Downloads</h4>
        
        <!-- Download ID Card Button -->
        <a href="${downloadLink}" style="background: linear-gradient(135deg, #f97316, #ea580c); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 15px; font-weight: 700; display: block; margin: 0 auto 15px auto; box-shadow: 0 8px 20px -6px rgba(234, 88, 12, 0.4); text-align: center; border: 1px solid rgba(255,255,255,0.1);">
          Download Digital ID Card (PDF)
        </a>

        <!-- Login Portal Button -->
        <a href="${portalLink}" style="background: #1e293b; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 15px; font-weight: 700; display: block; margin: 0 auto 15px auto; text-align: center; border: 1px solid rgba(255,255,255,0.08);">
          Login to live web portal
        </a>

        <!-- Play Store Button -->
        <a href="${playStoreLink}" style="background: #111827; color: #38bdf8; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 15px; font-weight: 700; display: block; margin: 0 auto; text-align: center; border: 1px solid rgba(56, 189, 248, 0.15);">
          Download Google Play Store Android App
        </a>
      </div>

      <p style="font-size: 12px; color: #64748b; text-align: center; line-height: 1.6; padding: 0 20px; font-weight: 400; margin-bottom: 25px;">
        A copy of your digital identity card is also attached directly to this email for offline convenience. Scan the QR code on the back of the card to securely verify your accreditation status at any time.
      </p>

      <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.05); margin: 30px 0;" />
      <p style="font-size: 10px; color: #475569; text-align: center; font-weight: 500; letter-spacing: 0.5px; margin: 0;">
        PALAMU EXPRESS DIGITAL MEDIA PORTAL © 2026. ALL RIGHTS RESERVED.
      </p>
    </div>
  `;

  // Send email asynchronously in background
  sendEmail({
    to: user.email,
    subject: `🎉 Congratulations! Your onboarding request is approved - Palamu Express`,
    html: emailHtml,
    attachments
  }).catch((err) => {
    console.error("[Mailer Exception] Failed to send approval email:", err.message);
  });

  res.json({ message: "User approved", user: await User.findById(user._id).select("-password") });
});

export const rejectUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    {
      approvalStatus: approvalStatuses.REJECTED,
      rejectionFeedback: req.body.feedback || "Details incomplete",
    },
    { new: true }
  ).select("-password");

  res.json({ message: "User rejected", user });
});

export const updateUserByAdmin = asyncHandler(async (req, res) => {
  const allowedFields = [
    "fullName",
    "email",
    "phone",
    "district",
    "area",
    "role",
    "approvalStatus",
    "isPhoneVerified",
    "isEmailVerified",
    "isFunctionalityDisabled",
    "validUpto",
    "bloodGroup",
    "education",
  ];
  const update = Object.fromEntries(
    Object.entries(req.body || {}).filter(([key]) => allowedFields.includes(key))
  );

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
  }

  Object.assign(user, update);
  if (Object.prototype.hasOwnProperty.call(update, "isPhoneVerified")) {
    user.isPhoneVerified = Boolean(update.isPhoneVerified);
  }
  if (Object.prototype.hasOwnProperty.call(update, "isEmailVerified")) {
    user.isEmailVerified = Boolean(update.isEmailVerified);
  }
  if (Object.prototype.hasOwnProperty.call(update, "isFunctionalityDisabled")) {
    user.isFunctionalityDisabled = Boolean(update.isFunctionalityDisabled);
  }

  if (req.body.profilePhotoUrl) {
    user.profilePhotoUrl = await uploadBase64Asset(req.body.profilePhotoUrl, "palamu-express/profile");
  }

  if (req.body.aadhaarImageUrl) {
    user.aadhaarImageUrl = await uploadBase64Asset(req.body.aadhaarImageUrl, "palamu-express/aadhaar");
  }

  if (req.body.livePhotoUrl) {
    user.livePhotoUrl = await uploadBase64Asset(req.body.livePhotoUrl, "palamu-express/live-photo");
  }

  if (user.approvalStatus === approvalStatuses.APPROVED) {
    await assignStaffIdentityArtifacts(user);
  } else {
    if (![roles.REPORTER, roles.CHIEF_EDITOR].includes(user.role) || user.approvalStatus !== approvalStatuses.APPROVED) {
      user.idCardUrl = undefined;
    }
  }

  await user.save();
  const sanitizedUser = await User.findById(user._id).select("-password");

  req.io?.to(`user:${user._id}`).emit("user:access-updated", {
    userId: String(user._id),
    isFunctionalityDisabled: Boolean(sanitizedUser?.isFunctionalityDisabled),
    approvalStatus: sanitizedUser?.approvalStatus,
    isPhoneVerified: Boolean(sanitizedUser?.isPhoneVerified),
    isEmailVerified: Boolean(sanitizedUser?.isEmailVerified),
  });

  res.json({ message: "User updated", user: sanitizedUser });
});

export const deleteUserByAdmin = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id).select("-password");
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
  }

  res.json({ message: "User deleted", user });
});

export const toggleBookmark = asyncHandler(async (req, res) => {
  const articleId = req.params.articleId;
  const hasBookmark = req.user.bookmarks.some((id) => id.toString() === articleId);

  const update = hasBookmark
    ? { $pull: { bookmarks: articleId } }
    : { $addToSet: { bookmarks: articleId } };

  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select("-password");
  res.json({ message: hasBookmark ? "Bookmark removed" : "Bookmarked", user });
});

export const getStaffCard = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
  }

  if (![roles.REPORTER, roles.CHIEF_EDITOR].includes(user.role)) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Only reporters and chief editors can access ID cards" });
  }

  if (user.approvalStatus !== approvalStatuses.APPROVED) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Your account is not approved yet. ID card will be available after approval." });
  }

  // Always regenerate on the fly to reflect any layout/template updates instantly!
  await assignStaffIdentityArtifacts(user);
  await user.save();

  res.json({ idCardUrl: user.idCardUrl });
});

export const verifyUserByCode = asyncHandler(async (req, res) => {
  const { code } = req.params;
  if (!code) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Verification code is required" });
  }

  const normalizedCode = String(code).trim().toUpperCase();

  const user = await User.findOne({
    $or: [
      { reporterCode: normalizedCode },
      { chiefEditorCode: normalizedCode }
    ]
  }).select("fullName role approvalStatus district area profilePhotoUrl livePhotoUrl reporterCode chiefEditorCode createdAt");

  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "No active record found for this accreditation code" });
  }

  res.json({ user });
});

export const downloadIdCard = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
  }

  if (!user.idCardUrl) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "ID card not generated yet" });
  }

  const matches = user.idCardUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid ID card data format" });
  }

  const contentType = matches[1];
  const base64Data = matches[2];
  const fileBuffer = Buffer.from(base64Data, "base64");

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="Palamu_Express_ID_Card_${user.reporterCode || user.chiefEditorCode || "Staff"}.pdf"`);
  res.send(fileBuffer);
});
