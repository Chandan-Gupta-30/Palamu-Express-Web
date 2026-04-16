import { useState } from "react";
import { http } from "../api/http";
import { NewsCard } from "../components/news/NewsCard";
import { jharkhandBlocksByDistrict, jharkhandDistricts } from "../data/districts";

export const SearchPage = () => {
  const [filters, setFilters] = useState({ district: "", area: "", keyword: "" });
  const [articles, setArticles] = useState([]);
  const blocks = filters.district ? jharkhandBlocksByDistrict[filters.district] || [] : [];

  const handleSearch = async (event) => {
    event.preventDefault();
    const { data } = await http.get("/articles", { params: filters });
    setArticles(data.articles);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <form onSubmit={handleSearch} className="panel grid gap-4 p-6 md:grid-cols-4">
        <select
          className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white"
          value={filters.district}
          onChange={(event) => setFilters({ ...filters, district: event.target.value, area: "" })}
        >
          <option value="">District</option>
          {jharkhandDistricts.map((district) => (
            <option key={district} value={district}>{district}</option>
          ))}
        </select>
        <select
          className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white"
          value={filters.area}
          onChange={(event) => setFilters({ ...filters, area: event.target.value })}
        >
          <option value="">Block / Area</option>
          {blocks.map((block) => (
            <option key={block} value={block}>{block}</option>
          ))}
        </select>
        <input
          placeholder="Keyword"
          autoFocus
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
          value={filters.keyword}
          onChange={(event) => setFilters({ ...filters, keyword: event.target.value })}
        />
        <button className="rounded-2xl bg-orange-500 px-6 py-3 font-semibold text-white">Search</button>
      </form>

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {articles.map((article) => (
          <NewsCard key={article._id} article={article} />
        ))}
      </div>
    </div>
  );
};
