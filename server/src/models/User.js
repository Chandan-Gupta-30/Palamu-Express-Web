import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { approvalStatuses, roles } from "../utils/constants.js";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 6 },
    role: {
      type: String,
      enum: Object.values(roles),
      default: roles.ADVERTISER,
    },
    approvalStatus: {
      type: String,
      enum: Object.values(approvalStatuses),
      default: approvalStatuses.PENDING,
    },
    isPhoneVerified: { type: Boolean, default: false },
    aadhaarNumber: { type: String },
    district: { type: String },
    area: { type: String },
    profilePhotoUrl: { type: String },
    aadhaarImageUrl: { type: String },
    livePhotoUrl: { type: String },
    reporterCode: { type: String, unique: true, sparse: true },
    chiefEditorCode: { type: String, unique: true, sparse: true },
    idCardUrl: { type: String },
    phoneOtpCode: { type: String, select: false },
    phoneOtpExpiresAt: { type: Date, select: false },
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Article" }],
    rejectionFeedback: { type: String },
    isFunctionalityDisabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function save(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model("User", userSchema);
