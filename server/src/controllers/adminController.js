import { asyncHandler } from "../utils/asyncHandler.js";
import { Article } from "../models/Article.js";
import { Advertisement } from "../models/Advertisement.js";
import { ContactMessage } from "../models/ContactMessage.js";
import { User } from "../models/User.js";
import { approvalStatuses, articleStatuses, roles } from "../utils/constants.js";

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
