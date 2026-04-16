import { StatusCodes } from "http-status-codes";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { approvalStatuses, roles } from "../utils/constants.js";
import { generateStaffCardBuffer } from "../utils/generateReporterCard.js";
import { uploadBase64Asset } from "../services/uploadService.js";

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

  user.reporterCode = undefined;
  user.chiefEditorCode = undefined;
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
      email,
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

  if ([roles.REPORTER, roles.CHIEF_EDITOR].includes(user.role)) {
    await assignStaffIdentityArtifacts(user);
  }

  await user.save();
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
  ];
  const update = Object.fromEntries(
    Object.entries(req.body || {}).filter(([key]) => allowedFields.includes(key))
  );

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "User not found" });
  }

  Object.assign(user, update);

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
    user.reporterCode = undefined;
    user.chiefEditorCode = undefined;
    if (![roles.REPORTER, roles.CHIEF_EDITOR].includes(user.role) || user.approvalStatus !== approvalStatuses.APPROVED) {
      user.idCardUrl = undefined;
    }
  }

  await user.save();
  res.json({ message: "User updated", user: await User.findById(user._id).select("-password") });
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

  if (!user.idCardUrl) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "ID card is not generated yet" });
  }

  res.json({ idCardUrl: user.idCardUrl });
});
