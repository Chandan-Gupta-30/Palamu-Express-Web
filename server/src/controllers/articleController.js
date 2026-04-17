import { StatusCodes } from "http-status-codes";
import { Article } from "../models/Article.js";
import { Analytics } from "../models/Analytics.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { approvalStatuses, articleStatuses, roles } from "../utils/constants.js";
import { generateVoiceDraft, summarizeArticle } from "../services/geminiService.js";
import { uploadBase64Asset } from "../services/uploadService.js";
import { env } from "../config/env.js";

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const canManageOwnArticles = (user) => [roles.REPORTER, roles.CHIEF_EDITOR, roles.SUPER_ADMIN].includes(user?.role);
const canReviewArticles = (user) => [roles.SUPER_ADMIN, roles.CHIEF_EDITOR].includes(user?.role);
const hasVerifiedEditorialAccess = (user) =>
  user?.approvalStatus === approvalStatuses.APPROVED && user?.isPhoneVerified;
const canSubmitArticle = (user) =>
  user?.role === roles.SUPER_ADMIN || hasVerifiedEditorialAccess(user);
const canPublishDirectly = (user) =>
  [roles.CHIEF_EDITOR, roles.SUPER_ADMIN].includes(user?.role);

const getDayRange = (dateValue) => {
  const normalized = new Date(`${dateValue}T00:00:00.000Z`);
  const nextDay = new Date(normalized);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return { start: normalized, end: nextDay };
};

const normalizeWaveform = (waveform) => {
  if (!Array.isArray(waveform)) return [];

  return waveform
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .map((value) => Math.max(0, Math.min(1, value)))
    .slice(0, 64);
};

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const stripHtml = (value) => String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const getArticlePreviewDescription = (article) => {
  const fallbackText = article?.excerpt || article?.content || article?.audioTranscript || "";
  return stripHtml(fallbackText).slice(0, 240) || "Read the latest report on Palamu Express.";
};

const buildArticlePayload = async (body) => {
  const coverImageUrl = await uploadBase64Asset(body.coverImageUrl, "palamu-express/articles");
  const audioUrl = await uploadBase64Asset(body.audioUrl, "palamu-express/audio-news");
  const audioTranscript = String(body.audioTranscript || "").trim();
  const content = String(body.content || audioTranscript || "").trim();
  const excerpt = String(body.excerpt || "").trim();

  if (!content && !audioUrl) {
    return {
      error: {
        status: StatusCodes.BAD_REQUEST,
        message: "Add article content or record a voice bulletin before publishing",
      },
    };
  }

  return {
    payload: {
      title: String(body.title || "").trim(),
      excerpt,
      content,
      coverImageUrl,
      audioUrl,
      audioDuration: Number(body.audioDuration) || 0,
      audioWaveform: normalizeWaveform(body.audioWaveform),
      audioTranscript,
      district: String(body.district || "").trim(),
      area: String(body.area || "").trim(),
      breaking: Boolean(body.breaking),
      tags: Array.isArray(body.tags) ? body.tags : undefined,
    },
  };
};

export const createArticle = asyncHandler(async (req, res) => {
  if (!canManageOwnArticles(req.user)) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Only newsroom roles can submit articles" });
  }

  if (!canSubmitArticle(req.user)) {
    return res.status(StatusCodes.FORBIDDEN).json({
      message: "Your account must be admin-approved and phone-verified before submitting news",
    });
  }

  const isPrivilegedPublisher = canPublishDirectly(req.user);
  const slugBase = slugify(req.body.title);
  const slug = `${slugBase}-${Date.now()}`;
  const { payload, error } = await buildArticlePayload(req.body);

  if (error) {
    return res.status(error.status).json({ message: error.message });
  }

  const aiSummary = await summarizeArticle(payload);

  const article = await Article.create({
    ...payload,
    ...(aiSummary ? { aiSummary } : {}),
    slug,
    author: req.user._id,
    status: isPrivilegedPublisher ? articleStatuses.PUBLISHED : articleStatuses.PENDING,
    reviewedBy: isPrivilegedPublisher ? req.user._id : undefined,
    publishedAt: isPrivilegedPublisher ? new Date() : undefined,
    editorFeedback: "",
  });

  res.status(StatusCodes.CREATED).json({ article });
});

export const updateArticle = asyncHandler(async (req, res) => {
  if (!canSubmitArticle(req.user)) {
    return res.status(StatusCodes.FORBIDDEN).json({
      message: "Your account must be admin-approved and phone-verified before updating news",
    });
  }

  const isPrivilegedPublisher = canPublishDirectly(req.user);
  const { payload, error } = await buildArticlePayload(req.body);

  if (error) {
    return res.status(error.status).json({ message: error.message });
  }

  const aiSummary = await summarizeArticle(payload);

  const article = await Article.findOneAndUpdate(
    { _id: req.params.id, author: req.user._id },
    {
      ...payload,
      ...(aiSummary ? { aiSummary } : {}),
      status: isPrivilegedPublisher ? articleStatuses.PUBLISHED : articleStatuses.PENDING,
      reviewedBy: isPrivilegedPublisher ? req.user._id : undefined,
      publishedAt: isPrivilegedPublisher ? new Date() : undefined,
      editorFeedback: "",
    },
    { new: true }
  );

  res.json({ article });
});

export const deleteArticle = asyncHandler(async (req, res) => {
  const article = await Article.findOneAndDelete({
    _id: req.params.id,
    author: req.user._id,
    status: { $ne: articleStatuses.PUBLISHED },
  });

  if (!article) {
    return res.status(StatusCodes.NOT_FOUND).json({
      message: "Only your non-published articles can be deleted",
    });
  }

  res.json({ message: "Article deleted" });
});

export const getHomepageFeed = asyncHandler(async (req, res) => {
  const selectedDate = String(req.query.date || "").trim();
  const parsedPage = Number.parseInt(String(req.query.page || "1"), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const latestPageSize = 10;
  const publishedQuery = { status: articleStatuses.PUBLISHED };

  if (selectedDate) {
    const { start, end } = getDayRange(selectedDate);
    publishedQuery.publishedAt = { $gte: start, $lt: end };
  }

  const totalLatest = await Article.countDocuments(publishedQuery);
  const totalPages = totalLatest ? Math.ceil(totalLatest / latestPageSize) : 0;
  const safePage = totalPages ? Math.min(page, totalPages) : 1;
  const latestSkip = totalPages ? (safePage - 1) * latestPageSize : 0;

  const voiceQuery = {
    ...publishedQuery,
    storyFormat: { $in: ["voice", "hybrid"] },
    audioUrl: { $exists: true, $ne: "" },
    audioDuration: { $gt: 0 },
  };

  const [breaking, latest, voiceHighlights] = await Promise.all([
    Article.find({ ...publishedQuery, breaking: true }).populate("author", "fullName district area").limit(5).sort({ publishedAt: -1 }),
    Article.find(publishedQuery).populate("author", "fullName district area").skip(latestSkip).limit(latestPageSize).sort({ publishedAt: -1 }),
    Article.find(voiceQuery).populate("author", "fullName district area").limit(4).sort({ publishedAt: -1 }),
  ]);
  const safeVoiceHighlights = voiceHighlights.filter(
    (article) =>
      Boolean(String(article.audioUrl || "").trim()) &&
      Number(article.audioDuration || 0) > 0 &&
      ["voice", "hybrid"].includes(article.storyFormat)
  );

  const trending = [...latest].sort((firstArticle, secondArticle) => {
    if ((secondArticle.trendingScore || 0) !== (firstArticle.trendingScore || 0)) {
      return (secondArticle.trendingScore || 0) - (firstArticle.trendingScore || 0);
    }

    return new Date(secondArticle.publishedAt || secondArticle.createdAt) - new Date(firstArticle.publishedAt || firstArticle.createdAt);
  });

  const districtMap = new Map();
  latest.forEach((article) => {
    const districtKey = article.district || "Unassigned";
    const existingGroup = districtMap.get(districtKey);

    if (existingGroup) {
      if (existingGroup.articles.length < 4) {
        existingGroup.articles.push(article);
      }
      return;
    }

    if (districtMap.size < 6) {
      districtMap.set(districtKey, {
        district: districtKey,
        articles: [article],
      });
    }
  });

  const districtWise = Array.from(districtMap.values());

  res.json({
    breaking,
    latest,
    voiceHighlights: safeVoiceHighlights,
    trending,
    districtWise,
    requestedDate: selectedDate,
    effectiveDate: selectedDate,
    isFallback: false,
    isDateFiltered: Boolean(selectedDate),
    pagination: {
      page: safePage,
      pageSize: latestPageSize,
      totalItems: totalLatest,
      totalPages,
      hasPreviousPage: safePage > 1,
      hasNextPage: totalPages > safePage,
    },
  });
});

export const getArticles = asyncHandler(async (req, res) => {
  const { district, area, keyword, status = articleStatuses.PUBLISHED, mine } = req.query;
  const query = {};

  if (status !== "all") {
    query.status = status;
  }

  if (district) query.district = district;
  if (area) query.area = area;
  if (keyword) query.$text = { $search: keyword };
  if (mine === "true" && req.user) query.author = req.user._id;

  const articles = await Article.find(query)
    .populate("author", "fullName district area")
    .sort({ createdAt: -1 });

  res.json({ articles });
});

export const getArticleBySlug = asyncHandler(async (req, res) => {
  const article = await Article.findOne({ slug: req.params.slug }).populate("author", "fullName district area");
  if (!article) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Article not found" });
  }

  res.json({ article });
});

export const getArticleSharePreview = asyncHandler(async (req, res) => {
  const article = await Article.findOne({ slug: req.params.slug, status: articleStatuses.PUBLISHED }).populate(
    "author",
    "fullName district area"
  );

  if (!article) {
    return res.status(StatusCodes.NOT_FOUND).send("Article not found");
  }

  const normalizedClientOrigin = String(env.clientUrl || "").trim().replace(/\/+$/, "");
  const articleUrl = `${normalizedClientOrigin}/article/${article.slug}`;
  const title = escapeHtml(article.title || "Palamu Express");
  const description = escapeHtml(getArticlePreviewDescription(article));
  const imageUrl = String(article.coverImageUrl || "").trim();
  const authorName = escapeHtml(article.author?.fullName || "Palamu Express Desk");
  const publishedTime = article.publishedAt || article.createdAt;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="author" content="${authorName}" />
    <meta name="robots" content="noindex,follow" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Palamu Express" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${escapeHtml(articleUrl)}" />
    ${imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}" />` : ""}
    <meta property="article:published_time" content="${new Date(publishedTime).toISOString()}" />
    <meta property="article:author" content="${authorName}" />
    <meta name="twitter:card" content="${imageUrl ? "summary_large_image" : "summary"}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    ${imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />` : ""}
    <meta http-equiv="refresh" content="0; url=${escapeHtml(articleUrl)}" />
    <link rel="canonical" href="${escapeHtml(articleUrl)}" />
    <script>
      window.location.replace(${JSON.stringify(articleUrl)});
    </script>
  </head>
  <body>
    <p>Redirecting to <a href="${escapeHtml(articleUrl)}">${title}</a>...</p>
  </body>
</html>`);
});

export const incrementArticleView = asyncHandler(async (req, res) => {
  const article = await Article.findOne({ slug: req.params.slug });
  if (!article) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Article not found" });
  }

  article.pageViews += 1;
  if (article.pageViews % 5 === 0) {
    article.trendingScore += 1;
  }
  await article.save();

  await Analytics.findOneAndUpdate(
    { slug: article.slug },
    { $inc: { views: 1 }, $setOnInsert: { article: article._id } },
    { upsert: true, new: true }
  );

  req.io?.to(`article:${article.slug}`).emit("analytics:update", {
    slug: article.slug,
    pageViews: article.pageViews,
  });

  res.json({ pageViews: article.pageViews });
});

export const approveArticle = asyncHandler(async (req, res) => {
  if (!canReviewArticles(req.user)) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Only super admin and chief editor can publish news" });
  }

  const article = await Article.findByIdAndUpdate(
    req.params.id,
    {
      status: articleStatuses.PUBLISHED,
      reviewedBy: req.user._id,
      editorFeedback: "",
      publishedAt: new Date(),
    },
    { new: true }
  );

  res.json({ message: "Article approved and published", article });
});

export const rejectArticle = asyncHandler(async (req, res) => {
  if (!canReviewArticles(req.user)) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Only super admin and chief editor can reject news submissions" });
  }

  const article = await Article.findByIdAndUpdate(
    req.params.id,
    {
      status: articleStatuses.REJECTED,
      reviewedBy: req.user._id,
      editorFeedback: req.body.feedback || "Needs revision",
    },
    { new: true }
  );

  res.json({ message: "Article rejected", article });
});

export const summarizeArticleById = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: "Article not found" });
  }

  if (String(article.aiSummary || "").trim()) {
    return res.status(StatusCodes.CONFLICT).json({
      message: "AI summary is already locked for this article.",
      aiSummary: article.aiSummary,
    });
  }

  const aiSummary = await summarizeArticle(article);
  if (!aiSummary) {
    return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
      message: "Live Gemini summary is temporarily unavailable. Please try again.",
    });
  }

  article.aiSummary = aiSummary;
  await article.save();

  res.json({ aiSummary });
});

export const generateVoiceArticleDraft = asyncHandler(async (req, res) => {
  if (!canManageOwnArticles(req.user)) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Only newsroom roles can generate voice drafts" });
  }

  if (!canSubmitArticle(req.user)) {
    return res.status(StatusCodes.FORBIDDEN).json({
      message: "Your account must be admin-approved and phone-verified before generating voice drafts",
    });
  }

  const fallbackTranscript = String(req.body.transcript || "").trim();
  const duration = Number(req.body.duration) || 0;
  const transcript = fallbackTranscript;

  if (!transcript && !duration) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "A browser transcript or recording duration is required" });
  }

  const draft = await generateVoiceDraft({
    transcript,
    duration,
  });

  res.json({
    draft,
    transcriptSource: transcript ? "browser-transcript" : "duration-only",
  });
});

export const getWorkflowArticles = asyncHandler(async (req, res) => {
  const statusFilter = req.query.status || "all";
  const mineOnly = req.query.mine === "true";
  const query = {};

  if (req.user.role === roles.REPORTER || mineOnly) {
    query.author = req.user._id;
  }

  if (statusFilter !== "all") {
    query.status = statusFilter;
  }

  const articles = await Article.find(query)
    .populate("author", "fullName district area")
    .sort({ createdAt: -1 });

  res.json({ articles });
});

export const getPublishedArticlesByDate = asyncHandler(async (req, res) => {
  const selectedDate = String(req.query.date || "").trim();

  if (!selectedDate) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "A date is required" });
  }

  const { start, end } = getDayRange(selectedDate);
  const articles = await Article.find({
    status: articleStatuses.PUBLISHED,
    publishedAt: { $gte: start, $lt: end },
  })
    .populate("author", "fullName district area")
    .sort({ publishedAt: -1, createdAt: -1 });

  res.json({ articles });
});

export const deletePublishedArticlesByDate = asyncHandler(async (req, res) => {
  const selectedDate = String(req.query.date || "").trim();

  if (!selectedDate) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "A date is required" });
  }

  const { start, end } = getDayRange(selectedDate);
  const result = await Article.deleteMany({
    status: articleStatuses.PUBLISHED,
    publishedAt: { $gte: start, $lt: end },
  });

  res.json({
    message: result.deletedCount
      ? `Deleted ${result.deletedCount} published article${result.deletedCount > 1 ? "s" : ""} for ${selectedDate}`
      : `No published articles found for ${selectedDate}`,
    deletedCount: result.deletedCount,
  });
});
