import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
  {
    article: { type: mongoose.Schema.Types.ObjectId, ref: "Article" },
    slug: { type: String, required: true },
    views: { type: Number, default: 0 },
    liveVisitors: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Analytics = mongoose.model("Analytics", analyticsSchema);

