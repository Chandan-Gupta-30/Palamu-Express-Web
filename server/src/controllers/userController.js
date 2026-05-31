import { StatusCodes } from "http-status-codes";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { approvalStatuses, roles } from "../utils/constants.js";
import { generateStaffCardBuffer } from "../utils/generateReporterCard.js";
import { generateAppointmentLetterBuffer, generateAuthorizationLetterBuffer } from "../utils/generateDocuments.js";
import { uploadBase64Asset } from "../services/uploadService.js";
import { sendEmail } from "../utils/mailer.js";
import { env } from "../config/env.js";

const assignStaffIdentityArtifacts = async (user) => {
  if ([roles.REPORTER, roles.CHIEF_EDITOR].includes(user.role)) {
    if (user.role === roles.REPORTER && !user.reporterCode) {
      user.reporterCode = `RPT-${String(Date.now()).slice(-6)}`;
    } else if (user.role === roles.CHIEF_EDITOR && !user.chiefEditorCode) {
      user.chiefEditorCode = `CED-${String(Date.now()).slice(-6)}`;
    }

    const [idBuffer, apptBuffer, authBuffer] = await Promise.all([
      generateStaffCardBuffer(user),
      generateAppointmentLetterBuffer(user),
      generateAuthorizationLetterBuffer(user)
    ]);

    const idBase64 = `data:application/pdf;base64,${idBuffer.toString("base64")}`;
    const apptBase64 = `data:application/pdf;base64,${apptBuffer.toString("base64")}`;
    const authBase64 = `data:application/pdf;base64,${authBuffer.toString("base64")}`;

    // Upload to Firebase Storage to avoid exceeding 1MB Firestore document size limits!
    const folder = `palamu-express/credentials/${user._id}`;
    const [uploadedId, uploadedAppt, uploadedAuth] = await Promise.all([
      uploadBase64Asset(idBase64, `${folder}/id-card`),
      uploadBase64Asset(apptBase64, `${folder}/appointment-letter`),
      uploadBase64Asset(authBase64, `${folder}/authorization-letter`)
    ]);

    user.idCardUrl = uploadedId;
    user.appointmentLetterUrl = uploadedAppt;
    user.authorizationLetterUrl = uploadedAuth;
  } else {
    user.idCardUrl = undefined;
    user.appointmentLetterUrl = undefined;
    user.authorizationLetterUrl = undefined;
  }
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

  // Extract other KYC fields if passed in request body
  const {
    district,
    area,
    aadhaarNumber,
    bloodGroup,
    education,
    profilePhotoUrl,
    aadhaarImageUrl,
    livePhotoUrl,
  } = req.body;

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

  // Update KYC fields if user is a reporter or chief editor
  if ([roles.REPORTER, roles.CHIEF_EDITOR].includes(user.role)) {
    if (district !== undefined) user.district = String(district || "").trim();
    if (area !== undefined) user.area = String(area || "").trim();
    if (aadhaarNumber !== undefined) {
      const aadhaarDigits = String(aadhaarNumber || "").replace(/\D/g, "");
      if (aadhaarDigits && aadhaarDigits.length !== 12) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Aadhaar number must be exactly 12 digits" });
      }
      user.aadhaarNumber = aadhaarDigits;
    }
    if (bloodGroup !== undefined) user.bloodGroup = String(bloodGroup || "O+").trim();
    if (education !== undefined) user.education = String(education || "").trim();

    // Upload base64 files if present
    if (profilePhotoUrl && profilePhotoUrl.startsWith("data:")) {
      user.profilePhotoUrl = await uploadBase64Asset(profilePhotoUrl, "palamu-express/profile");
    } else if (profilePhotoUrl !== undefined) {
      user.profilePhotoUrl = profilePhotoUrl;
    }

    if (aadhaarImageUrl && aadhaarImageUrl.startsWith("data:")) {
      user.aadhaarImageUrl = await uploadBase64Asset(aadhaarImageUrl, "palamu-express/aadhaar");
    } else if (aadhaarImageUrl !== undefined) {
      user.aadhaarImageUrl = aadhaarImageUrl;
    }

    if (livePhotoUrl && livePhotoUrl.startsWith("data:")) {
      user.livePhotoUrl = await uploadBase64Asset(livePhotoUrl, "palamu-express/live-photo");
    } else if (livePhotoUrl !== undefined) {
      user.livePhotoUrl = livePhotoUrl;
    }
  }

  const wasRejected = user.approvalStatus === approvalStatuses.REJECTED;

  if (wasRejected) {
    user.approvalStatus = approvalStatuses.PENDING;
    user.rejectionFeedback = "";
  }

  if (user.approvalStatus === approvalStatuses.APPROVED && [roles.REPORTER, roles.CHIEF_EDITOR].includes(user.role)) {
    await assignStaffIdentityArtifacts(user);
  }

  await user.save();

  if (wasRejected) {
    try {
      const superAdmins = await User.find({ role: roles.SUPER_ADMIN });
      for (const admin of superAdmins) {
        const newNotif = await Notification.create({
          userId: String(admin._id),
          title: "Onboarding Request Re-submitted",
          message: `${user.fullName} has updated their profile credentials and re-submitted their onboarding request for review.`,
          type: "direct",
          senderId: String(user._id),
          createdAt: Date.now(),
          onboardingUserId: String(user._id),
        });
        req.io?.to(`user:${admin._id}`).emit("notification:received", { notification: newNotif });
      }
    } catch (notifErr) {
      console.error("[updateMyCredentials] Failed to trigger re-submission notification:", notifErr.message);
    }
  }

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

  const downloadRemoteBuffer = async (url) => {
    if (!url) return null;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP status ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      console.error(`[Mailer Fetch Error] Failed to pre-fetch attachment from ${url}:`, err.message);
      return null;
    }
  };

  let attachments = [];
  if (user.idCardUrl) {
    if (user.idCardUrl.startsWith("data:")) {
      const commaIndex = user.idCardUrl.indexOf(",");
      if (commaIndex !== -1) {
        attachments.push({
          filename: `Palamu_Express_ID_Card_${staffCode || "Staff"}.pdf`,
          content: Buffer.from(user.idCardUrl.substring(commaIndex + 1), "base64"),
          contentType: "application/pdf"
        });
      }
    } else {
      const buffer = await downloadRemoteBuffer(user.idCardUrl);
      if (buffer) {
        attachments.push({
          filename: `Palamu_Express_ID_Card_${staffCode || "Staff"}.pdf`,
          content: buffer,
          contentType: "application/pdf"
        });
      }
    }
  }

  if (user.appointmentLetterUrl) {
    if (user.appointmentLetterUrl.startsWith("data:")) {
      const commaIndex = user.appointmentLetterUrl.indexOf(",");
      if (commaIndex !== -1) {
        attachments.push({
          filename: `Palamu_Express_Appointment_Letter_${staffCode || "Staff"}.pdf`,
          content: Buffer.from(user.appointmentLetterUrl.substring(commaIndex + 1), "base64"),
          contentType: "application/pdf"
        });
      }
    } else {
      const buffer = await downloadRemoteBuffer(user.appointmentLetterUrl);
      if (buffer) {
        attachments.push({
          filename: `Palamu_Express_Appointment_Letter_${staffCode || "Staff"}.pdf`,
          content: buffer,
          contentType: "application/pdf"
        });
      }
    }
  }

  if (user.authorizationLetterUrl) {
    if (user.authorizationLetterUrl.startsWith("data:")) {
      const commaIndex = user.authorizationLetterUrl.indexOf(",");
      if (commaIndex !== -1) {
        attachments.push({
          filename: `Palamu_Express_Authorization_Letter_${staffCode || "Staff"}.pdf`,
          content: Buffer.from(user.authorizationLetterUrl.substring(commaIndex + 1), "base64"),
          contentType: "application/pdf"
        });
      }
    } else {
      const buffer = await downloadRemoteBuffer(user.authorizationLetterUrl);
      if (buffer) {
        attachments.push({
          filename: `Palamu_Express_Authorization_Letter_${staffCode || "Staff"}.pdf`,
          content: buffer,
          contentType: "application/pdf"
        });
      }
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
          <br/><br/>
          <strong>Your official Press ID Card, A4 Appointment Letter, and Credentials Authorization Letter have been compiled and attached directly to this email as premium PDFs for your records.</strong>
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
        A copy of your digital identity card, appointment letter, and credentials authorization letter are attached directly to this email for offline convenience. Scan the QR code on the letters or the back of the ID card to securely verify your accreditation status at any time.
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
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
  }

  const rejectionFeedback = req.body.feedback || "Details incomplete";
  user.approvalStatus = approvalStatuses.REJECTED;
  user.rejectionFeedback = rejectionFeedback;
  user.idCardUrl = undefined;
  user.appointmentLetterUrl = undefined;
  user.authorizationLetterUrl = undefined;
  await user.save();

  // Create persistent database notification for user
  let newNotif;
  try {
    newNotif = await Notification.create({
      userId: String(user._id),
      title: "Verification Request Rejected",
      message: `Your credentials review was rejected. Reason: ${rejectionFeedback}. Please update your profile to re-apply.`,
      type: "direct",
      senderId: String(req.user._id),
      createdAt: Date.now(),
    });
    
    // Real-time socket targeted push
    req.io?.to(`user:${user._id}`).emit("notification:received", { notification: newNotif });
    
    // Emit socket event to push status update instantly to client
    req.io?.to(`user:${user._id}`).emit("user:access-updated", {
      userId: String(user._id),
      isFunctionalityDisabled: Boolean(user.isFunctionalityDisabled),
      approvalStatus: user.approvalStatus,
      isPhoneVerified: Boolean(user.isPhoneVerified),
      isEmailVerified: Boolean(user.isEmailVerified),
    });
  } catch (notifErr) {
    console.error("[rejectUser] Error creating/emitting rejection notification:", notifErr.message);
  }

  // Send premium dark-themed email alert explaining corrections needed
  const portalLink = `${env.clientUrl}/login`;
  const emailHtml = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #020617; padding: 45px 20px; color: #f8fafc; border-radius: 24px; max-width: 600px; margin: 0 auto; border: 1px solid rgba(239, 68, 68, 0.2); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
      <!-- Header -->
      <div style="text-align: center; border-bottom: 2px solid #ef4444; padding-bottom: 25px; margin-bottom: 30px;">
        <h1 style="color: #ef4444; font-size: 34px; font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: 3px; font-family: 'Helvetica Neue', Arial, sans-serif;">PALAMU EXPRESS</h1>
        <p style="color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 5px; margin: 6px 0 0 0; font-weight: 600;">Digital Media Newsroom</p>
      </div>

      <!-- Alert -->
      <div style="text-align: center; margin-bottom: 35px;">
        <span style="background-color: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 8px 20px; border-radius: 9999px; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; display: inline-block;">ACTION REQUIRED: ONBOARDING CORRECTIONS</span>
        <h2 style="color: #ffffff; font-size: 26px; font-weight: 800; margin: 25px 0 12px 0;">Attention required, ${user.fullName}</h2>
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.7; margin: 0; font-weight: 300;">
          Your onboarding application to join the Palamu Express Digital Media newsroom has been reviewed by the credentials verification board. Unfortunately, your request requires corrections before we can issue your official Press ID Card and appointment letters.
        </p>
      </div>

      <!-- Feedback Box -->
      <div style="background: rgba(239, 68, 68, 0.05); border-radius: 20px; padding: 25px; border: 1px solid rgba(239, 68, 68, 0.15); margin-bottom: 35px;">
        <h3 style="color: #ef4444; font-size: 16px; font-weight: 700; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">Credentials Review Feedback</h3>
        <p style="color: #f1f5f9; font-size: 14px; line-height: 1.6; margin: 0; font-family: monospace; white-space: pre-wrap; font-weight: 600;">
          ${rejectionFeedback}
        </p>
      </div>

      <!-- Next Steps -->
      <div style="background: #0f172a; border-radius: 20px; padding: 25px; border: 1px solid rgba(255, 255, 255, 0.05); margin-bottom: 35px;">
        <h3 style="color: #ea580c; font-size: 15px; font-weight: 700; margin: 0 0 18px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); padding-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">How to Correct & Re-Submit</h3>
        <ol style="color: #cbd5e1; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px; font-weight: 300;">
          <li style="margin-bottom: 10px;">Log in to the <a href="${portalLink}" style="color: #38bdf8; text-decoration: underline; font-weight: 600;">Palamu Express Portal</a> using your registered phone and password.</li>
          <li style="margin-bottom: 10px;">Navigate to the <strong>Security & Credentials</strong> tab in your dashboard sidebar.</li>
          <li style="margin-bottom: 10px;">Update and correct the mismatching details highlighted by the admin in the feedback box above.</li>
          <li style="margin-bottom: 10px;">Click <strong>Save Changes</strong>. The system will automatically clear your feedback and re-submit your profile to the onboarding queue for instant review.</li>
        </ol>
      </div>

      <p style="font-size: 12px; color: #64748b; text-align: center; line-height: 1.6; padding: 0 20px; font-weight: 400; margin-bottom: 25px;">
        Once your corrections are verified and approved, your official Press ID Card, appointment letter, and authorization letter will be dispatched to your inbox immediately.
      </p>

      <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.05); margin: 30px 0;" />
      <p style="font-size: 10px; color: #475569; text-align: center; font-weight: 500; letter-spacing: 0.5px; margin: 0;">
        PALAMU EXPRESS DIGITAL MEDIA PORTAL © 2026. ALL RIGHTS RESERVED.
      </p>
    </div>
  `;

  sendEmail({
    to: user.email,
    subject: `⚠️ Action Required: Onboarding Request Rejected - Palamu Express`,
    html: emailHtml,
  }).catch((err) => {
    console.error("[Mailer Exception] Failed to send rejection email:", err.message);
  });

  res.json({ message: "User rejected", user: await User.findById(user._id).select("-password") });
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

  if (user.idCardUrl.startsWith("data:")) {
    const commaIndex = user.idCardUrl.indexOf(",");
    if (commaIndex === -1) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: "Invalid ID card data format" });
    }
    const contentType = user.idCardUrl.substring(5, commaIndex).split(";")[0] || "application/pdf";
    const base64Data = user.idCardUrl.substring(commaIndex + 1);
    const fileBuffer = Buffer.from(base64Data, "base64");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="Palamu_Express_ID_Card_${user.reporterCode || user.chiefEditorCode || "Staff"}.pdf"`);
    return res.send(fileBuffer);
  } else {
    try {
      const response = await fetch(user.idCardUrl);
      if (!response.ok) throw new Error("Failed to fetch card from storage");
      const arrayBuffer = await response.arrayBuffer();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Palamu_Express_ID_Card_${user.reporterCode || user.chiefEditorCode || "Staff"}.pdf"`);
      return res.send(Buffer.from(arrayBuffer));
    } catch (err) {
      return res.redirect(user.idCardUrl);
    }
  }
});

export const downloadAppointmentLetter = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
  }

  if (user.approvalStatus !== approvalStatuses.APPROVED || ![roles.REPORTER, roles.CHIEF_EDITOR].includes(user.role)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Appointment letter is not available for this user status" });
  }

  const apptBuffer = await generateAppointmentLetterBuffer(user);
  
  // Update Firestore cache if it differs or is missing, using storage URL to avoid size crashes!
  const base64Data = `data:application/pdf;base64,${apptBuffer.toString("base64")}`;
  if (!user.appointmentLetterUrl || user.appointmentLetterUrl.startsWith("data:")) {
    const folder = `palamu-express/credentials/${user._id}`;
    const uploadedUrl = await uploadBase64Asset(base64Data, `${folder}/appointment-letter`);
    user.appointmentLetterUrl = uploadedUrl;
    await user.save();
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="Palamu_Express_Appointment_Letter_${user.reporterCode || user.chiefEditorCode || "Staff"}.pdf"`);
  res.send(apptBuffer);
});

export const downloadAuthorizationLetter = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
  }

  if (user.approvalStatus !== approvalStatuses.APPROVED || ![roles.REPORTER, roles.CHIEF_EDITOR].includes(user.role)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Authorization letter is not available for this user status" });
  }

  const authBuffer = await generateAuthorizationLetterBuffer(user);

  // Update Firestore cache if it differs or is missing, using storage URL to avoid size crashes!
  const base64Data = `data:application/pdf;base64,${authBuffer.toString("base64")}`;
  if (!user.authorizationLetterUrl || user.authorizationLetterUrl.startsWith("data:")) {
    const folder = `palamu-express/credentials/${user._id}`;
    const uploadedUrl = await uploadBase64Asset(base64Data, `${folder}/authorization-letter`);
    user.authorizationLetterUrl = uploadedUrl;
    await user.save();
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="Palamu_Express_Authorization_Letter_${user.reporterCode || user.chiefEditorCode || "Staff"}.pdf"`);
  res.send(authBuffer);
});
