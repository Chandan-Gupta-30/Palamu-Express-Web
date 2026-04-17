import { Link } from "react-router-dom";
import { MessageCircleMore } from "lucide-react";
import { AudioStoryPlayer } from "../audio/AudioStoryPlayer";
import { getArticleAuthorName, getArticlePublishedLabel, getWhatsAppShareLink } from "../../utils/articles";

export const NewsCard = ({ article }) => (
  <article className="panel overflow-hidden">
    {article.coverImageUrl ? (
      <div className="flex h-44 items-center justify-center overflow-hidden bg-slate-950/40">
        <img src={article.coverImageUrl} alt={article.title} className="h-full w-full object-contain" />
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
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-500/10 text-emerald-300 transition hover:border-emerald-300/50 hover:bg-emerald-500/20 hover:text-emerald-200"
        >
          <MessageCircleMore className="h-4 w-4" />
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
