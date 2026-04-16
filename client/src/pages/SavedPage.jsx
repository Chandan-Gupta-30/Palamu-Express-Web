import { useEffect, useState } from "react";
import { NewsCard } from "../components/news/NewsCard";
import { http } from "../api/http";

export const SavedPage = () => {
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    http.get("/users/me").then(({ data }) => {
      setBookmarks(data.user.bookmarks || []);
    }).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Saved News</p>
        <h1 className="mt-3 font-display text-4xl text-white">Your bookmarked stories</h1>
      </div>

      {bookmarks.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {bookmarks.map((article) => (
            <NewsCard key={article._id} article={article} />
          ))}
        </div>
      ) : (
        <div className="panel p-8 text-slate-400">No saved stories yet. Open an article and use the bookmark action.</div>
      )}
    </div>
  );
};
