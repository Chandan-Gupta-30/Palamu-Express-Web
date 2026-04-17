import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Bookmark } from "lucide-react";
import { http } from "../api/http";
import { AudioStoryPlayer } from "../components/audio/AudioStoryPlayer";
import { ShareBar } from "../components/news/ShareBar";
import { ActionPopup } from "../components/ui/ActionPopup";
import { useSocket } from "../hooks/useSocket";
import { useAuth } from "../context/AuthContext";
import { getArticleAuthorName, getArticlePageUrl, getArticlePublishedLabel, getArticleSharePreviewUrl } from "../utils/articles";

const GeminiIcon = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
    <path
      d="M12 2.5c.7 4.3 4.2 7.8 8.5 8.5-4.3.7-7.8 4.2-8.5 8.5-.7-4.3-4.2-7.8-8.5-8.5 4.3-.7 7.8-4.2 8.5-8.5Z"
      className="fill-current"
    />
  </svg>
);

export const ArticlePage = () => {
  const { slug } = useParams();
  const location = useLocation();
  const { user, refreshUser } = useAuth();
  const [article, setArticle] = useState(null);
  const [summary, setSummary] = useState("");
  const [displayedSummary, setDisplayedSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [bookmarkMessage, setBookmarkMessage] = useState("");
  const [summaryReplayToken, setSummaryReplayToken] = useState(0);
  const [actionPopup, setActionPopup] = useState(null);
  const { pageViews } = useSocket(slug);

  useEffect(() => {
    http.get(`/articles/${slug}`).then(({ data }) => {
      setArticle(data.article);
      setSummary(data.article.aiSummary || "");
      setDisplayedSummary("");
      setSummaryError("");
    });
  }, [slug]);

  useEffect(() => {
    if (!summary) {
      setDisplayedSummary("");
      return undefined;
    }

    let cancelled = false;
    let index = 0;
    setDisplayedSummary("");

    const tick = () => {
      if (cancelled) return;

      index += Math.max(1, Math.ceil(summary.length / 120));
      setDisplayedSummary(summary.slice(0, index));

      if (index < summary.length) {
        window.setTimeout(tick, 24);
      }
    };

    const timer = window.setTimeout(tick, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [summary, summaryReplayToken]);

  useEffect(() => {
    if (!article?._id || summary || summaryLoading) return;

    let cancelled = false;

    const generateSummary = async () => {
      try {
        setSummaryLoading(true);
        setSummaryError("");
        const { data } = await http.post(`/articles/${article._id}/summarize`);
        if (!cancelled) {
          setSummary(data.aiSummary || "");
          setArticle((current) => (current ? { ...current, aiSummary: data.aiSummary || "" } : current));
        }
      } catch (error) {
        if (!cancelled) {
          setSummaryError(error.response?.data?.message || "Live AI summary is unavailable right now.");
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      }
    };

    generateSummary();

    return () => {
      cancelled = true;
    };
  }, [article?._id, summary, summaryLoading]);

  useEffect(() => {
    if (!slug || !location.key) return;

    const viewKey = `article-view:${slug}:${location.key}`;
    if (sessionStorage.getItem(viewKey)) return;

    sessionStorage.setItem(viewKey, "1");
    http.post(`/articles/${slug}/view`).catch(() => {
      sessionStorage.removeItem(viewKey);
    });
  }, [slug, location.key]);

  if (!article) {
    return <div className="mx-auto max-w-4xl px-4 py-12 text-slate-500">Loading article...</div>;
  }

  const articleUrl = getArticlePageUrl(slug);
  const whatsappPreviewUrl = getArticleSharePreviewUrl(slug);
  const isBookmarked = Boolean(user?.bookmarks?.some((item) => (item._id || item).toString() === article._id));
  const summaryLocked = Boolean(summary);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <ActionPopup
        open={Boolean(actionPopup)}
        type={actionPopup?.type}
        title={actionPopup?.title}
        message={actionPopup?.message}
        persistent={actionPopup?.persistent}
        onClose={actionPopup?.persistent ? undefined : () => setActionPopup(null)}
      />
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-orange-300">
          {article.district} • {article.area}
        </p>
        <h1 className="font-display text-4xl text-white md:text-5xl">{article.title}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
          <span>By {getArticleAuthorName(article)}</span>
          <span>Published: {getArticlePublishedLabel(article)}</span>
          <span>Views: {pageViews || article.pageViews}</span>
          <span>Status: {article.status}</span>
        </div>
      </div>

      {article.coverImageUrl ? (
        <div className="flex h-80 w-full items-center justify-center overflow-hidden rounded-3xl bg-slate-950/40">
          <img src={article.coverImageUrl} alt={article.title} className="h-full w-full object-contain" />
        </div>
      ) : null}

      {article.audioUrl ? <AudioStoryPlayer article={article} title={article.title} /> : null}

      <div className="panel p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">{article.audioUrl ? "Story Notes" : "Full Story"}</h2>
          {article.storyFormat ? (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-300">
              {article.storyFormat}
            </span>
          ) : null}
        </div>
        <p className="mt-4 whitespace-pre-line leading-8 text-slate-400">
          {article.content || article.audioTranscript || "This voice bulletin does not include written story notes yet."}
        </p>
      </div>

      <div className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">AI Summary</h2>
          <div className="flex items-center gap-3">
            {summaryLocked ? (
              <span className="gemini-badge inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-300">
                <GeminiIcon className="h-3.5 w-3.5" />
                Smart cache active
              </span>
            ) : null}
            <button
              type="button"
              disabled={summaryLoading}
              onClick={async () => {
                if (summaryLocked) {
                  setSummaryError("");
                  setSummaryLoading(true);
                  window.setTimeout(() => {
                    setSummaryReplayToken((value) => value + 1);
                    setSummaryLoading(false);
                  }, 650);
                  return;
                }

                try {
                  setSummaryLoading(true);
                  setSummaryError("");
                  const { data } = await http.post(`/articles/${article._id}/summarize`);
                  setSummary(data.aiSummary || "");
                  setArticle((current) => (current ? { ...current, aiSummary: data.aiSummary || "" } : current));
                } catch (error) {
                  const lockedSummary = error.response?.data?.aiSummary || "";
                  if (lockedSummary) {
                    setSummary(lockedSummary);
                    setArticle((current) => (current ? { ...current, aiSummary: lockedSummary } : current));
                    setSummaryReplayToken((value) => value + 1);
                  }
                  setSummaryError(error.response?.data?.message || "Live AI summary is unavailable right now.");
                } finally {
                  setSummaryLoading(false);
                }
              }}
              className="gemini-trigger inline-flex h-11 w-11 items-center justify-center rounded-full border border-orange-300/30 bg-[linear-gradient(135deg,rgba(251,191,36,0.22),rgba(249,115,22,0.22),rgba(255,255,255,0.06))] text-orange-100 shadow-[0_12px_30px_rgba(249,115,22,0.22)] transition hover:scale-[1.03] hover:border-orange-200/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={summaryLoading ? "Preparing AI summary" : "Generate AI summary with Gemini"}
              title={summaryLoading ? "Preparing AI summary" : "Generate AI summary with Gemini"}
            >
              <GeminiIcon className={`h-5 w-5 ${summaryLoading ? "animate-pulse" : ""}`} />
            </button>
          </div>
        </div>
        <p className="mt-4 min-h-24 text-slate-400">
          {displayedSummary || (summaryLoading ? "Preparing AI summary..." : "Generate a quick AI summary for this report.")}
          {summaryLoading || (summary && displayedSummary.length < summary.length) ? <span className="ml-1 inline-block h-5 w-[2px] animate-pulse bg-orange-300 align-middle" /> : null}
        </p>
        {summaryError ? <p className="mt-3 text-sm text-rose-400">{summaryError}</p> : null}
      </div>

      {user ? (
        <div className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Save Story</h2>
              <p className="mt-1 text-sm text-slate-500">Bookmark this article to access it later from your saved-news page.</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const { data } = await http.patch(`/users/bookmarks/${article._id}`);
                setBookmarkMessage(data.message);
                await refreshUser();
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${isBookmarked ? "bg-white text-slate-900" : "bg-orange-500 text-white"}`}
            >
              <Bookmark className="mr-2 inline" size={16} />
              {isBookmarked ? "Saved" : "Save Article"}
            </button>
          </div>
          {bookmarkMessage ? <p className="mt-3 text-sm text-green-500">{bookmarkMessage}</p> : null}
        </div>
      ) : null}

      <ShareBar
        url={articleUrl}
        title={article.title}
        whatsappUrl={whatsappPreviewUrl}
        onCopy={({ type, message }) =>
          setActionPopup({
            type,
            title: type === "success" ? "Link copied" : "Copy failed",
            message,
          })}
      />
    </div>
  );
};
