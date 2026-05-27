import { useState, useEffect } from "react";
import { FileText, Mic, Users, MapPin, Calendar, Eye, Share2, Edit3, Trash2 } from "lucide-react";
import { AudioStoryPlayer } from "../audio/AudioStoryPlayer";
import { newsCategoryLabels } from "../../data/districts";
import { getArticlePublishedLabel } from "../../utils/articles";

const getTodayDateString = () => new Date().toISOString().slice(0, 10);

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getArticleViews = (article) => Number(article?.pageViews || 0).toLocaleString("en-IN");

// Category badge color mapper
const getCategoryStyles = (category) => {
  switch (category) {
    case "politics":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "crime":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    case "sports":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "business":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "agriculture":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "education":
      return "bg-violet-500/10 text-violet-400 border-violet-500/20";
    case "public_grievances":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "health":
      return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    case "technology":
      return "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20";
    default:
      return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
};

export const PublishedArchiveSection = ({
  selectedDate,
  onDateChange,
  articles,
  onRefresh,
  onDelete,
  busy,
  onEditArticle,
  onDeleteArticle,
  onCopyLink,
  onOpenArticle,
}) => {
  const [archiveSearch, setArchiveSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Reset pagination when search query or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [archiveSearch, pageSize]);

  const filteredArticles = articles.filter((article) => {
    const term = archiveSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      article.title?.toLowerCase().includes(term) ||
      (article.excerpt || "").toLowerCase().includes(term) ||
      (article.content || "").toLowerCase().includes(term) ||
      (article.category || "").toLowerCase().includes(term) ||
      (article.author?.fullName || "").toLowerCase().includes(term) ||
      (article.district || "").toLowerCase().includes(term) ||
      (article.area || "").toLowerCase().includes(term) ||
      (article.panchayat || "").toLowerCase().includes(term)
    );
  });

  // Calculate pagination bounds
  const totalEntries = filteredArticles.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);
  const paginatedArticles = filteredArticles.slice(startIndex, endIndex);

  return (
    <div className="panel p-6 border border-white/5 bg-slate-900/10">
      {/* Header section */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between border-b border-white/5 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">Chronological Logs</p>
          <h2 className="text-2xl font-bold text-white mt-1">Published News Archive By Date</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Review and manage all homepage articles published on a specific date. Clean up outdated stories instantly by date or keyword search.
          </p>
        </div>
        <div className="w-full max-w-xs relative">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400" htmlFor="published-news-archive-date">
              Published Date
            </label>
            {selectedDate && (
              <button
                type="button"
                onClick={() => onDateChange("")}
                className="text-[10px] font-bold text-orange-400 hover:text-orange-300 transition-colors uppercase tracking-wider outline-none"
              >
                Clear Filter
              </button>
            )}
          </div>
          <input
            id="published-news-archive-date"
            type="date"
            max={getTodayDateString()}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:border-orange-500/80 focus:ring-4 focus:ring-orange-500/10 transition"
            value={selectedDate}
            onChange={(event) => onDateChange(event.target.value)}
          />
        </div>
      </div>

      {/* Filter and Global Action Row */}
      <div className="mt-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-grow max-w-md">
          <input
            type="text"
            placeholder="Search archived news by title, category, author, area..."
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-orange-500/80 focus:ring-4 focus:ring-orange-500/10 transition"
            value={archiveSearch}
            onChange={(e) => setArchiveSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <button type="button" onClick={onRefresh} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5 hover:border-white/20 transition">
            Refresh List
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy || !articles.length || !selectedDate}
            className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-rose-500 transition shadow-lg"
          >
            {busy ? "Deleting..." : selectedDate ? "Delete All For This Date" : "Select Date to Wipe"}
          </button>
        </div>
      </div>

      {/* Tabular CMS Interface */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/5 bg-slate-900/10 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Article Details</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Category</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Author & Location</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Publish Date</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Views</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedArticles.map((article) => {
                const badgeStyle = getCategoryStyles(article.category);
                
                return (
                  <tr key={article._id} className="hover:bg-white/[0.01] transition duration-150 group">
                    {/* Column 1: Article details (Cover Image + Title) */}
                    <td className="px-6 py-4 max-w-sm">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-slate-950/60 border border-white/5 flex items-center justify-center">
                          {article.coverImageUrl ? (
                            <img src={article.coverImageUrl} alt={article.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-gradient-to-br from-orange-500/20 via-slate-800 to-slate-900 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-orange-400/40" />
                            </div>
                          )}
                          {article.audioUrl && (
                            <span className="absolute bottom-1 right-1 rounded bg-emerald-500 p-0.5 text-white" title="Voice News">
                              <Mic size={8} />
                            </span>
                          )}
                        </div>
                        
                        <div className="min-w-0">
                          <h4 
                            onClick={() => onOpenArticle(article)}
                            className="font-bold text-white hover:text-orange-400 transition cursor-pointer truncate text-sm line-clamp-1 outline-none"
                            title={article.title}
                          >
                            {article.title}
                          </h4>
                          {article.excerpt ? (
                            <p className="text-xs text-slate-500 line-clamp-1 truncate mt-1 max-w-[280px]">
                              {article.excerpt}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-600 italic mt-0.5">No excerpt provided</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Category Badges */}
                    <td className="px-6 py-4">
                      {article.category ? (
                        <span className={`inline-block rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${badgeStyle}`}>
                          {newsCategoryLabels[article.category] || article.category}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Uncategorized</span>
                      )}
                    </td>

                    {/* Column 3: Author and Geolocation details */}
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                        <Users size={12} className="text-slate-500 shrink-0" />
                        <span className="truncate max-w-[120px]">{article.author?.fullName || "Unknown"}</span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin size={10} className="text-slate-600 shrink-0" />
                        <span className="truncate max-w-[150px]">
                          {[article.district, article.area].filter(Boolean).join(" • ") || "-"}
                        </span>
                      </div>
                    </td>

                    {/* Column 4: Published date detail */}
                    <td className="px-6 py-4">
                      <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-500" />
                        {getArticlePublishedLabel(article)}
                      </div>
                    </td>

                    {/* Column 5: Pageviews count */}
                    <td className="px-6 py-4">
                      <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Eye size={12} className="text-slate-500" />
                        {getArticleViews(article)}
                      </div>
                    </td>

                    {/* Column 6: Action icons aligned cleanly */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenArticle(article)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:text-white"
                          title="View Article"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCopyLink(article);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:text-white"
                          title="Copy Share Link"
                        >
                          <Share2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditArticle(article);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-900 transition hover:bg-slate-100"
                          title="Edit Article"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteArticle(article);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-600/10 border border-rose-500/20 text-rose-400 transition hover:bg-rose-600 hover:text-white hover:border-rose-600"
                          title="Delete Article"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty Search Result State */}
        {!paginatedArticles.length && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white/[0.01]">
            <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 text-slate-400 mb-4 animate-pulse">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">No archived news matches</h3>
            <p className="mt-1.5 text-xs text-slate-500 max-w-sm leading-5">
              {articles.length 
                ? "We couldn't find any news articles matching your search query. Try broadening your keywords." 
                : "No published articles exist in our database records for this selected date."}
            </p>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalEntries > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 pt-5">
          <div className="text-xs text-slate-500">
            Showing <span className="font-semibold text-white">{startIndex + 1}</span> to{" "}
            <span className="font-semibold text-white">{endIndex}</span> of{" "}
            <span className="font-semibold text-white">{totalEntries}</span> entries
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Page Size Select */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Rows per page:</span>
              <select
                className="rounded-xl border border-white/10 bg-slate-950 px-2 py-1 text-xs text-white focus:outline-none"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </select>
            </div>
            
            {/* Page switching buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white disabled:opacity-40 hover:bg-white/5 transition"
              >
                Previous
              </button>
              <span className="text-xs text-slate-400 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white disabled:opacity-40 hover:bg-white/5 transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
