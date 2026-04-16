import { asyncHandler } from "../utils/asyncHandler.js";
import { Analytics } from "../models/Analytics.js";
import { Article } from "../models/Article.js";

export const getAnalyticsOverview = asyncHandler(async (req, res) => {
  const [topArticles, totalViews] = await Promise.all([
    Article.find().sort({ pageViews: -1 }).limit(10).select("title slug pageViews district"),
    Analytics.aggregate([{ $group: { _id: null, views: { $sum: "$views" } } }]),
  ]);

  res.json({
    totalViews: totalViews[0]?.views || 0,
    topArticles,
  });
});

