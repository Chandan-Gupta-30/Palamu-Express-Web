import mongoose from "mongoose";
import { adPlacements, adStatuses } from "../utils/constants.js";

const advertisementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
    targetUrl: { type: String, default: "" },
    placement: {
      type: String,
      enum: Object.values(adPlacements),
      required: true,
      default: adPlacements.HOMEPAGE_LATEST,
    },
    durationDays: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true },
    priority: { type: Number, default: 100, min: 1 },
    description: { type: String, default: "" },
    ctaLabel: { type: String, default: "Visit Sponsor" },
    status: {
      type: String,
      enum: Object.values(adStatuses),
      default: adStatuses.PENDING_PAYMENT,
    },
    advertiser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    advertiserName: { type: String, required: true, trim: true },
    advertiserEmail: { type: String, required: true, trim: true, lowercase: true },
    advertiserPhone: { type: String, required: true, trim: true },
    companyName: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paidAt: { type: Date },
    startsAt: { type: Date },
    endsAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export const Advertisement = mongoose.model("Advertisement", advertisementSchema);
