import { runtimeConfig } from "../config/runtime";

const stripTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

export const getArticleAuthorName = (article) => article?.author?.fullName || "Palamu Express Desk";

export const formatArticleTimestamp = (value) => {
  if (!value) return "Publishing time unavailable";

  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const getArticlePublishedLabel = (article) =>
  formatArticleTimestamp(article?.publishedAt || article?.createdAt);

export const getArticlePageUrl = (slug) => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${stripTrailingSlash(window.location.origin)}/article/${slug}`;
  }

  return `${stripTrailingSlash(runtimeConfig.apiOrigin)}/article/${slug}`;
};

export const getArticleSharePreviewUrl = (slug) => `${stripTrailingSlash(runtimeConfig.apiOrigin)}/share/article/${slug}`;

export const getWhatsAppShareLink = ({ slug, title }) => {
  const shareUrl = getArticleSharePreviewUrl(slug);
  const cleanTitle = String(title || "").trim();
  const message = `🔥 *ब्रेकिंग न्यूज़: ${cleanTitle}*\n\nपूरी खबर पढ़ने और वीडियो/ऑडियो देखने के लिए यहाँ क्लिक करें 👇\n👉 ${shareUrl}\n\n📰 *पलामू एक्सप्रेस - झारखंड की आवाज़*`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
};
