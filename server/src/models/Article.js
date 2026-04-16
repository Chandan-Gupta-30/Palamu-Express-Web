import mongoose from "mongoose";
import { articleStatuses } from "../utils/constants.js";

const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String, required: true },
    content: { type: String, default: "" },
    coverImageUrl: { type: String },
    audioUrl: { type: String },
    audioDuration: { type: Number, default: 0 },
    audioWaveform: [{ type: Number }],
    audioTranscript: { type: String, default: "" },
    storyFormat: {
      type: String,
      enum: ["text", "voice", "hybrid"],
      default: "text",
    },
    district: { type: String, required: true },
    area: { type: String, required: true },
    tags: [{ type: String }],
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: Object.values(articleStatuses),
      default: articleStatuses.PENDING,
    },
    breaking: { type: Boolean, default: false },
    trendingScore: { type: Number, default: 0 },
    pageViews: { type: Number, default: 0 },
    aiSummary: { type: String },
    editorFeedback: { type: String },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

articleSchema.pre("validate", function validateStoryPayload(next) {
  const hasContent = Boolean(this.content?.trim());
  const hasAudio = Boolean(this.audioUrl?.trim());

  if (!hasContent && !hasAudio) {
    this.invalidate("content", "Either article content or a recorded voice clip is required");
  }

  if (hasAudio && hasContent) {
    this.storyFormat = "hybrid";
  } else if (hasAudio) {
    this.storyFormat = "voice";
  } else {
    this.storyFormat = "text";
  }

  next();
});

articleSchema.index({ title: "text", excerpt: "text", content: "text", district: "text", area: "text" });

export const Article = mongoose.model("Article", articleSchema);
