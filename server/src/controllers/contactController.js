import { StatusCodes } from "http-status-codes";
import { ContactMessage } from "../models/ContactMessage.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { verifyToken } from "../utils/jwt.js";
import { User } from "../models/User.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const createContactMessage = asyncHandler(async (req, res) => {
  let userId = "";
  let fullName = String(req.body.fullName || "").trim();
  let email = String(req.body.email || "").trim().toLowerCase();
  let phone = String(req.body.phone || "").trim();
  const subject = String(req.body.subject || "").trim();
  const message = String(req.body.message || "").trim();
  const status = String(req.body.status || "new").trim();

  // Try to associate logged-in user if Bearer token is present
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);
      if (user) {
        userId = user._id;
        if (!fullName) fullName = user.fullName;
        if (!email) email = user.email;
        if (!phone) phone = user.phone || "";
      }
    } catch (e) {
      // Ignore invalid auth token for public queries
    }
  }

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
    status,
    userId,
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

export const getMyQueries = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const messages = await ContactMessage.find({ userId }).sort({ createdAt: -1 });
  res.json({ messages });
});

export const clearAllContactMessages = asyncHandler(async (req, res) => {
  await ContactMessage.deleteMany({});
  res.json({ message: "All contact messages cleared successfully." });
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

  // Trigger real-time status update to client via Socket.io
  if (req.io) {
    req.io.emit("query:updated", {
      queryId: message._id,
      status: message.status,
      adminNote: message.adminNote,
    });
  }

  // Push notification inside the notification system if a userId is linked
  if (message.userId && (req.body.status || req.body.adminNote)) {
    try {
      const { Notification } = await import("../models/Notification.js");
      const title = `Support Query Resolved: ${message.subject}`;
      const notificationContent = `Your query status is now "${message.status}" by Super Admin.${
        message.adminNote ? ` Note: ${message.adminNote}` : ""
      }`;

      const notification = await Notification.create({
        userId: message.userId,
        title,
        message: notificationContent,
        type: "direct",
        isRead: false,
        createdAt: Date.now(),
      });

      if (req.io) {
        req.io.emit("notification:received", { notification });
      }
    } catch (err) {
      console.error("[updateContactMessage] Failed to create push notification:", err.message);
    }
  }

  res.json({ message: "Contact message updated", contactMessage: message });
});

export const deleteContactMessage = asyncHandler(async (req, res) => {
  const message = await ContactMessage.findByIdAndDelete(req.params.id);

  if (!message) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Contact message not found" });
  }

  res.json({ message: "Contact message deleted" });
});
