import mongoose from "mongoose";

const contactStatuses = ["new", "in_progress", "resolved"];

const contactMessageSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: contactStatuses,
      default: "new",
    },
    adminNote: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export const ContactMessage = mongoose.model("ContactMessage", contactMessageSchema);
