import { StatusCodes } from "http-status-codes";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Fetch notifications for the current logged-in user
export const getNotifications = asyncHandler(async (req, res) => {
  const userId = String(req.user._id);

  // Retrieve all notifications
  const allNotifications = await Notification.find();

  // Filter notifications relevant to this user:
  // 1. Direct notification for this user: userId matches req.user._id
  // 2. Broadcast notification: userId is "all" AND user has not cleared/dismissed it
  const filtered = allNotifications.filter((notif) => {
    const isDirect = notif.type === "direct" && String(notif.userId) === userId;
    const isBroadcast = notif.type === "broadcast" && notif.userId === "all";
    const isCleared = notif.clearedBy && notif.clearedBy.includes(userId);
    
    return (isDirect || isBroadcast) && !isCleared;
  });

  // Map notifications to include dynamic isRead state for broadcasts
  const notifications = filtered.map((notif) => {
    const isRead = notif.type === "broadcast"
      ? (notif.readBy && notif.readBy.includes(userId))
      : Boolean(notif.isRead);

    return {
      _id: notif._id,
      userId: notif.userId,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      senderId: notif.senderId,
      createdAt: notif.createdAt,
      isRead,
      articleId: notif.articleId,
      onboardingUserId: notif.onboardingUserId,
    };
  });

  // Sort by createdAt descending (newest first)
  notifications.sort((a, b) => b.createdAt - a.createdAt);

  res.json({ notifications });
});

// Mark a single notification as read
export const markRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = String(req.user._id);

  const notif = await Notification.findById(id);
  if (!notif) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Notification not found" });
  }

  if (notif.type === "broadcast") {
    if (!notif.readBy) notif.readBy = [];
    if (!notif.readBy.includes(userId)) {
      notif.readBy.push(userId);
      await notif.save();
    }
  } else {
    if (String(notif.userId) !== userId) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Access denied" });
    }
    notif.isRead = true;
    await notif.save();
  }

  res.json({ success: true, message: "Notification marked as read" });
});

// Mark all active notifications as read for current user
export const markAllRead = asyncHandler(async (req, res) => {
  const userId = String(req.user._id);
  const allNotifications = await Notification.find();

  for (const notif of allNotifications) {
    if (notif.type === "broadcast" && notif.userId === "all") {
      const isCleared = notif.clearedBy && notif.clearedBy.includes(userId);
      if (!isCleared) {
        if (!notif.readBy) notif.readBy = [];
        if (!notif.readBy.includes(userId)) {
          notif.readBy.push(userId);
          await notif.save();
        }
      }
    } else if (notif.type === "direct" && String(notif.userId) === userId && !notif.isRead) {
      notif.isRead = true;
      await notif.save();
    }
  }

  res.json({ success: true, message: "All notifications marked as read" });
});

// Clear/Dismiss a notification from user's dashboard view
export const clearNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = String(req.user._id);

  const notif = await Notification.findById(id);
  if (!notif) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Notification not found" });
  }

  if (notif.type === "broadcast") {
    if (!notif.clearedBy) notif.clearedBy = [];
    if (!notif.clearedBy.includes(userId)) {
      notif.clearedBy.push(userId);
      // Also automatically mark as read if they clear it
      if (!notif.readBy) notif.readBy = [];
      if (!notif.readBy.includes(userId)) {
        notif.readBy.push(userId);
      }
      await notif.save();
    }
  } else {
    if (String(notif.userId) !== userId) {
      return res.status(StatusCodes.FORBIDDEN).json({ message: "Access denied" });
    }
    // Direct notifications are simply deleted when cleared
    await Notification.findByIdAndDelete(id);
  }

  res.json({ success: true, message: "Notification cleared" });
});

// Clear all active notifications for current user
export const clearAllNotifications = asyncHandler(async (req, res) => {
  const userId = String(req.user._id);
  const allNotifications = await Notification.find();

  for (const notif of allNotifications) {
    if (notif.type === "broadcast" && notif.userId === "all") {
      const isCleared = notif.clearedBy && notif.clearedBy.includes(userId);
      if (!isCleared) {
        if (!notif.clearedBy) notif.clearedBy = [];
        notif.clearedBy.push(userId);
        
        // Also mark as read
        if (!notif.readBy) notif.readBy = [];
        if (!notif.readBy.includes(userId)) {
          notif.readBy.push(userId);
        }
        await notif.save();
      }
    } else if (notif.type === "direct" && String(notif.userId) === userId) {
      await Notification.findByIdAndDelete(notif._id);
    }
  }

  res.json({ success: true, message: "All notifications cleared from dashboard view" });
});

// Super Admin push alert
export const adminSendNotification = asyncHandler(async (req, res) => {
  const { title, message, recipientId } = req.body;

  if (!title || !message || !recipientId) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Title, message, and recipient parameters are required" });
  }

  let newNotif;

  if (recipientId === "all") {
    newNotif = await Notification.create({
      userId: "all",
      title,
      message,
      type: "broadcast",
      senderId: String(req.user._id),
      createdAt: Date.now(),
    });

    // Real-time broadcast push
    req.io?.emit("notification:received", { notification: newNotif });
  } else {
    // Validate recipient user exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: "Recipient user not found" });
    }

    newNotif = await Notification.create({
      userId: recipientId,
      title,
      message,
      type: "direct",
      senderId: String(req.user._id),
      createdAt: Date.now(),
    });

    // Real-time targeted push to the user's private socket room
    req.io?.to(`user:${recipientId}`).emit("notification:received", { notification: newNotif });
  }

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Notification successfully dispatched!",
    notification: newNotif,
  });
});

// Super Admin fetch all notifications globally
export const adminGetAllNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find();
  
  // Sort descending
  notifications.sort((a, b) => b.createdAt - a.createdAt);

  // Hydrate user info if possible
  const hydrated = [];
  for (const notif of notifications) {
    let recipientName = "All Staff (Broadcast)";
    if (notif.type === "direct") {
      try {
        const u = await User.findById(notif.userId);
        recipientName = u ? `${u.fullName} (${String(u.role).replaceAll("_", " ")})` : "Deleted User";
      } catch (_) {
        recipientName = "Unknown User";
      }
    }
    hydrated.push({
      ...notif,
      recipientName,
    });
  }

  res.json({ notifications: hydrated });
});

// Super Admin delete single globally
export const adminDeleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notif = await Notification.findById(id);
  if (!notif) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Notification not found" });
  }

  await Notification.findByIdAndDelete(id);

  // Emit a retraction sync so the client knows it has been deleted globally
  req.io?.emit("notification:deleted", { notificationId: id });

  res.json({ success: true, message: "Notification globally deleted and retracted from all dashboards" });
});

// Super Admin bulk delete globally
export const adminDeleteAllNotifications = asyncHandler(async (req, res) => {
  const { filter } = req.query; // "all", "broadcast", or a specific userId

  if (filter === "broadcast") {
    await Notification.deleteMany({ type: "broadcast" });
  } else if (filter && filter !== "all") {
    await Notification.deleteMany({ userId: filter });
  } else {
    await Notification.deleteMany({});
  }

  // Reload trigger
  req.io?.emit("notification:refresh");

  res.json({ success: true, message: "Selected notifications globally purged" });
});
