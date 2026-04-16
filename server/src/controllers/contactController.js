import { StatusCodes } from "http-status-codes";
import { ContactMessage } from "../models/ContactMessage.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const createContactMessage = asyncHandler(async (req, res) => {
  const fullName = String(req.body.fullName || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const phone = String(req.body.phone || "").trim();
  const subject = String(req.body.subject || "").trim();
  const message = String(req.body.message || "").trim();

  if (!fullName || !email || !subject || !message) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Full name, email, subject, and message are required" });
  }

  if (!emailPattern.test(email)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Enter a valid email address" });
  }

  if (phone && !/^\d{10}$/.test(phone)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Phone number must be exactly 10 digits if provided" });
  }

  const contactMessage = await ContactMessage.create({
    fullName,
    email,
    phone,
    subject,
    message,
  });

  res.status(StatusCodes.CREATED).json({
    message: "Your message has been sent to the newsroom desk",
    contactMessage,
  });
});

export const getContactMessages = asyncHandler(async (req, res) => {
  const status = String(req.query.status || "").trim();
  const query = status ? { status } : {};
  const messages = await ContactMessage.find(query).sort({ createdAt: -1 });
  res.json({ messages });
});

export const updateContactMessage = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findById(req.params.id);

  if (!message) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Contact message not found" });
  }

  if (req.body.status) {
    message.status = req.body.status;
  }

  if (typeof req.body.adminNote === "string") {
    message.adminNote = req.body.adminNote.trim();
  }

  await message.save();
  res.json({ message: "Contact message updated", contactMessage: message });
});

export const deleteContactMessage = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findByIdAndDelete(req.params.id);

  if (!message) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Contact message not found" });
  }

  res.json({ message: "Contact message deleted" });
});
