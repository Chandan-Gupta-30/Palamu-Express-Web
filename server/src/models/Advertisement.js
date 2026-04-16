import mongoose from "mongoose";
import { adPlacements, adStatuses } from "../utils/constants.js";

const advertisementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
    targetUrl: { type: String, required: true },
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
    advertiser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    razorpayOrderId: { type: String },
    startsAt: { type: Date },
    endsAt: { type: Date },
  },
  { timestamps: true }
);

export const Advertisement = mongoose.model("Advertisement", advertisementSchema);
