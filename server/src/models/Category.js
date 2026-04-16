import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    state: { type: String, default: "Jharkhand" },
    district: { type: String, required: true },
    block: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
  },
  { timestamps: true }
);

export const Category = mongoose.model("Category", categorySchema);

