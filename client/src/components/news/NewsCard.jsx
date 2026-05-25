import { Link } from "react-router-dom";
import { AudioStoryPlayer } from "../audio/AudioStoryPlayer";
import { WhatsAppIcon } from "./WhatsAppIcon";
import { getArticleAuthorName, getArticlePublishedLabel, getWhatsAppShareLink } from "../../utils/articles";

export const NewsCard = ({ article }) => (
  <article className="panel overflow-hidden">
    {article.coverImageUrl ? (
      <div className="flex h-44 items-center justify-center overflow-hidden bg-slate-950/40">
        <img src={article.coverImageUrl} alt={article.title} className="h-full w-full object-contain" loading="lazy" />
      </div>
    ) : (
      <div className="h-44 bg-gradient-to-br from-orange-500/30 via-slate-800 to-slate-900" />
    )}
    <div className="space-y-3 p-5">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
        <span>{article.district}</span>
        <span>{article.audioUrl ? "Voice Live" : article.area}</span>
      </div>
      <div className="flex items-start justify-between gap-3 text-sm text-slate-400">
        <div>
          <p>By {getArticleAuthorName(article)}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{getArticlePublishedLabel(article)}</p>
        </div>
        <a
          href={getWhatsAppShareLink({ slug: article.slug, title: article.title })}
          target="_blank"
          rel="noreferrer"
          aria-label={`Share ${article.title} on WhatsApp`}
          className="whatsapp-share-button inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-500/10 text-emerald-300 transition hover:border-emerald-300/50 hover:bg-emerald-500/20 hover:text-emerald-200"
        >
          <WhatsAppIcon className="h-4 w-4" />
        </a>
      </div>
      <h3 className="text-xl font-semibold text-white">{article.title}</h3>
      <p className="text-sm leading-6 text-slate-300">{article.excerpt}</p>
      {article.audioUrl ? <AudioStoryPlayer article={article} compact /> : null}
      <Link to={`/article/${article.slug}`} className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-900">
        {article.audioUrl ? "Open Story & Audio" : "Read Story"}
      </Link>
    </div>
  </article>
);

export const NewsCardSkeleton = () => (
  <div className="panel overflow-hidden animate-pulse">
    <div className="h-44 bg-slate-800" />
    <div className="space-y-4 p-5">
      <div className="flex justify-between">
        <div className="h-3 w-16 bg-slate-700 rounded" />
        <div className="h-3 w-16 bg-slate-700 rounded" />
      </div>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-slate-700" />
        <div className="space-y-2 flex-1">
          <div className="h-3 w-24 bg-slate-700 rounded" />
          <div className="h-2 w-16 bg-slate-700 rounded" />
        </div>
      </div>
      <div className="h-5 bg-slate-700 rounded w-5/6" />
      <div className="space-y-2">
        <div className="h-3 bg-slate-700 rounded" />
        <div className="h-3 bg-slate-700 rounded w-4/5" />
      </div>
      <div className="h-8 bg-slate-700 rounded w-28" />
    </div>
  </div>
);

