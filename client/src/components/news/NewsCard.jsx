import { Link } from "react-router-dom";
import { AudioStoryPlayer } from "../audio/AudioStoryPlayer";

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
      <h3 className="text-xl font-semibold text-white">{article.title}</h3>
      <p className="text-sm leading-6 text-slate-300">{article.excerpt}</p>
      {article.audioUrl ? <AudioStoryPlayer article={article} compact /> : null}
      <Link to={`/article/${article.slug}`} className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-900">
        {article.audioUrl ? "Open Story & Audio" : "Read Story"}
      </Link>
    </div>
  </article>
);
