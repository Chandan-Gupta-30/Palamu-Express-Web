import { asyncHandler } from "../utils/asyncHandler.js";
import { Article } from "../models/Article.js";
import { Advertisement } from "../models/Advertisement.js";
import { ContactMessage } from "../models/ContactMessage.js";
import { User } from "../models/User.js";
import { approvalStatuses, articleStatuses, roles } from "../utils/constants.js";
import { db } from "../config/firebase.js";

const ensureActiveEditorialAccess = (user, res) => {
  if (user?.role !== roles.SUPER_ADMIN && user?.isFunctionalityDisabled) {
    res.status(403).json({ message: "Your editorial actions are currently disabled by the super admin." });
    return false;
  }

  return true;
};

export const getDashboardOverview = asyncHandler(async (req, res) => {
  if (!ensureActiveEditorialAccess(req.user, res)) return;

  const [users, pendingUsers, pendingArticles, publishedArticles, activeAds, contactMessages, newContactMessages] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ approvalStatus: approvalStatuses.PENDING }),
    Article.countDocuments({ status: articleStatuses.PENDING }),
    Article.countDocuments({ status: articleStatuses.PUBLISHED }),
    Advertisement.countDocuments({ status: "active" }),
    ContactMessage.countDocuments(),
    ContactMessage.countDocuments({ status: "new" }),
  ]);

  res.json({
    metrics: { users, pendingUsers, pendingArticles, publishedArticles, activeAds, contactMessages, newContactMessages },
  });
});

export const getPendingApprovals = asyncHandler(async (req, res) => {
  if (!ensureActiveEditorialAccess(req.user, res)) return;

  const [pendingUsers, pendingArticles] = await Promise.all([
    User.find({
      approvalStatus: approvalStatuses.PENDING,
      role: { $in: [roles.REPORTER, roles.CHIEF_EDITOR] },
    })
      .select("-password")
      .sort({ createdAt: -1 }),
    Article.find({ status: articleStatuses.PENDING }).populate("author", "fullName district area phone").sort({ createdAt: -1 }),
  ]);

  res.json({ pendingUsers, pendingArticles });
});

export const getDashboardPayload = asyncHandler(async (req, res) => {
  if (!ensureActiveEditorialAccess(req.user, res)) return;

  const role = req.user.role;
  const userId = req.user._id;

  const todayStr = new Date().toISOString().slice(0, 10);
  const getDayRange = (dateValue) => {
    const normalized = new Date(`${dateValue}T00:00:00.000Z`);
    const nextDay = new Date(normalized);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    return { start: normalized, end: nextDay };
  };
  const { start, end } = getDayRange(todayStr);

  // Fetch Global Expiry settings
  let globalIdCardExpiry = "";
  try {
    const configSnap = await db.collection("settings").doc("global_config").get();
    if (configSnap.exists) {
      globalIdCardExpiry = configSnap.get("globalIdCardExpiry") || "";
    }
  } catch (err) {
    console.error("[getDashboardPayload] Error loading global config settings:", err.message);
  }

  if (role === roles.SUPER_ADMIN) {
    const [
      usersCount,
      pendingUsersCount,
      pendingArticlesCount,
      publishedArticlesCount,
      activeAdsCount,
      contactMessagesCount,
      newContactMessagesCount,
      pendingUsers,
      pendingArticles,
      managedUsers,
      ads,
      contactMessages,
      myArticles,
      publishedArchiveArticles
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ approvalStatus: approvalStatuses.PENDING }),
      Article.countDocuments({ status: articleStatuses.PENDING }),
      Article.countDocuments({ status: articleStatuses.PUBLISHED }),
      Advertisement.countDocuments({ status: "active" }),
      ContactMessage.countDocuments(),
      ContactMessage.countDocuments({ status: "new" }),
      
      User.find({
        approvalStatus: approvalStatuses.PENDING,
        role: { $in: [roles.REPORTER, roles.CHIEF_EDITOR] },
      }).select("-password").sort({ createdAt: -1 }),
      Article.find({ status: articleStatuses.PENDING }).populate("author", "fullName district area phone").sort({ createdAt: -1 }),
      
      User.find({ role: { $in: [roles.REPORTER, roles.CHIEF_EDITOR] } }).select("-password").sort({ createdAt: -1 }),
      
      Advertisement.find({}).sort({ createdAt: -1 }),
      
      ContactMessage.find({}).sort({ createdAt: -1 }),
      
      Article.find({}).populate("author", "fullName district area").sort({ createdAt: -1 }),
      
      Article.find({
        status: articleStatuses.PUBLISHED,
        publishedAt: { $gte: start, $lt: end },
      }).populate("author", "fullName district area").sort({ publishedAt: -1, createdAt: -1 })
    ]);

    res.json({
      metrics: {
        users: usersCount,
        pendingUsers: pendingUsersCount,
        pendingArticles: pendingArticlesCount,
        publishedArticles: publishedArticlesCount,
        activeAds: activeAdsCount,
        contactMessages: contactMessagesCount,
        newContactMessages: newContactMessagesCount
      },
      pendingUsers,
      pendingArticles,
      managedUsers,
      ads,
      contactMessages,
      myArticles,
      publishedArchiveArticles,
      globalIdCardExpiry
    });
    return;
  }

  if (role === roles.CHIEF_EDITOR) {
    const [
      usersCount,
      pendingUsersCount,
      pendingArticlesCount,
      publishedArticlesCount,
      activeAdsCount,
      contactMessagesCount,
      newContactMessagesCount,
      pendingArticles,
      myArticles,
      publishedArchiveArticles
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ approvalStatus: approvalStatuses.PENDING }),
      Article.countDocuments({ status: articleStatuses.PENDING }),
      Article.countDocuments({ status: articleStatuses.PUBLISHED }),
      Advertisement.countDocuments({ status: "active" }),
      ContactMessage.countDocuments(),
      ContactMessage.countDocuments({ status: "new" }),

      Article.find({ status: articleStatuses.PENDING }).populate("author", "fullName district area phone").sort({ createdAt: -1 }),

      Article.find({ author: userId }).populate("author", "fullName district area").sort({ createdAt: -1 }),

      Article.find({
        status: articleStatuses.PUBLISHED,
        publishedAt: { $gte: start, $lt: end },
      }).populate("author", "fullName district area").sort({ publishedAt: -1, createdAt: -1 })
    ]);

    res.json({
      metrics: {
        users: usersCount,
        pendingUsers: pendingUsersCount,
        pendingArticles: pendingArticlesCount,
        publishedArticles: publishedArticlesCount,
        activeAds: activeAdsCount,
        contactMessages: contactMessagesCount,
        newContactMessages: newContactMessagesCount
      },
      pendingArticles,
      myArticles,
      publishedArchiveArticles,
      globalIdCardExpiry
    });
    return;
  }

  if (role === roles.REPORTER) {
    const myArticles = await Article.find({ author: userId }).populate("author", "fullName district area").sort({ createdAt: -1 });
    res.json({ myArticles, globalIdCardExpiry });
    return;
  }

  res.status(400).json({ message: "Invalid role dashboard request" });
});

export const updateGlobalSettings = asyncHandler(async (req, res) => {
  if (!ensureActiveEditorialAccess(req.user, res)) return;

  // Only allow Super Admins to modify configuration settings
  if (req.user.role !== roles.SUPER_ADMIN) {
    return res.status(403).json({ message: "Only the Platform Super Admin can adjust system-wide expiry controls." });
  }

  const { globalIdCardExpiry } = req.body;

  await db.collection("settings").doc("global_config").set({
    globalIdCardExpiry: globalIdCardExpiry || ""
  }, { merge: true });

  res.json({
    success: true,
    message: "Global ID Card Expiry updated successfully.",
    globalIdCardExpiry: globalIdCardExpiry || ""
  });
});

