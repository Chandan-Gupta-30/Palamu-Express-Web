import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { http } from "../api/http";
import { NewsCard } from "../components/news/NewsCard";
import { jharkhandBlocksByDistrict, jharkhandDistricts } from "../data/districts";

export const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const districtParam = searchParams.get("district") || "";
  const areaParam = searchParams.get("area") || "";
  const keywordParam = searchParams.get("keyword") || "";

  const [filters, setFilters] = useState({
    district: districtParam,
    area: areaParam,
    keyword: keywordParam,
  });
  const [articles, setArticles] = useState([]);
  const blocks = filters.district ? jharkhandBlocksByDistrict[filters.district] || [] : [];

  // URL search parameters are the single source of truth for loading data
  useEffect(() => {
    const activeFilters = {
      district: searchParams.get("district") || "",
      area: searchParams.get("area") || "",
      keyword: searchParams.get("keyword") || "",
    };
    
    // Sync local dropdown states with searchParams (vital for back/forward browser history)
    setFilters(activeFilters);

    if (activeFilters.district || activeFilters.area || activeFilters.keyword) {
      http.get("/articles", { params: activeFilters })
        .then(({ data }) => {
          setArticles(data.articles || []);
        })
        .catch((err) => console.error("Auto search failed:", err));
    } else {
      // Clear articles if search filters are fully cleared
      setArticles([]);
    }
  }, [searchParams]);

  const handleSearch = (event) => {
    event.preventDefault();
    
    // Sync browser URL search parameters; this triggers the useEffect to perform the API fetch
    const params = {};
    if (filters.district) params.district = filters.district;
    if (filters.area) params.area = filters.area;
    if (filters.keyword) params.keyword = filters.keyword;
    setSearchParams(params);
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

      {articles.length > 0 ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {articles.map((article) => (
            <NewsCard key={article._id} article={article} />
          ))}
        </div>
      ) : (
        <div className="mt-8 panel p-8 text-center text-slate-500">
          No articles match your query. Adjust options and try searching again.
        </div>
      )}
    </div>
  );
};
