import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Headphones, X } from "lucide-react";
import { http } from "../api/http";
import { AudioStoryPlayer } from "../components/audio/AudioStoryPlayer";
import { NewsCard } from "../components/news/NewsCard";
import { WhatsAppIcon } from "../components/news/WhatsAppIcon";
import { getArticleAuthorName, getArticlePublishedLabel, getWhatsAppShareLink } from "../utils/articles";

const initialFeed = {
  breaking: [],
  latest: [],
  voiceHighlights: [],
  trending: [],
  districtWise: [],
  requestedDate: "",
  effectiveDate: "",
  isFallback: false,
  isDateFiltered: false,
  pagination: {
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  },
};

const groupAdsByPlacement = (ads) =>
  ads.reduce(
    (accumulator, ad) => {
      const key = ad.placement || "homepage-latest";
      accumulator[key] = [...(accumulator[key] || []), ad];
      return accumulator;
    },
    { "homepage-hero": [], "homepage-latest": [], "homepage-district": [] }
  );

const AdCard = ({ ad, compact = false }) => (
  <a
    href={ad.targetUrl || undefined}
    target={ad.targetUrl ? "_blank" : undefined}
    rel={ad.targetUrl ? "noreferrer" : undefined}
    className={`ad-card group block overflow-hidden rounded-3xl border border-orange-400/20 bg-gradient-to-br from-orange-500/10 via-slate-900 to-slate-950 ${compact ? "h-full" : ""}`}
  >
    {ad.imageUrl ? (
      <div className={compact ? "aspect-[16/10] overflow-hidden bg-slate-950/60 p-3" : "aspect-[16/9] overflow-hidden bg-slate-950/60 p-4"}>
        <img src={ad.imageUrl} alt={ad.title} className="h-full w-full object-contain object-center transition duration-300 group-hover:scale-[1.02]" />
      </div>
    ) : null}
    <div className="space-y-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="ad-card-pill rounded-full bg-orange-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-200">
          Sponsored
        </span>
        <span className="ad-card-meta text-xs text-slate-400">Priority {ad.priority}</span>
      </div>
      <h3 className="ad-card-title text-lg font-semibold text-white">{ad.title}</h3>
      {ad.description ? <p className="ad-card-description text-sm leading-6 text-slate-300">{ad.description}</p> : null}
      <span className="ad-card-cta inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-900">{ad.targetUrl ? ad.ctaLabel || "Visit Sponsor" : "Banner Only"}</span>
    </div>
  </a>
);

const StoryImage = ({ src, alt, className = "" }) => (
  <div className={`flex items-center justify-center overflow-hidden rounded-3xl bg-slate-950/40 ${className}`}>
    <img src={src} alt={alt} className="h-full w-full object-contain" />
  </div>
);

const EmptyAdSlot = ({ title, description }) => (
  <div className="ad-empty-slot rounded-3xl border border-dashed border-orange-300/20 bg-white/[0.03] p-5">
    <p className="ad-empty-kicker text-xs uppercase tracking-[0.24em] text-orange-200/80">Sponsor Slot</p>
    <p className="ad-empty-title mt-3 text-base font-semibold text-white">{title}</p>
    <p className="ad-empty-description mt-2 text-sm leading-6 text-slate-500">{description}</p>
  </div>
);

const StoryListLink = ({ article, children, className = "" }) => (
  <Link to={`/article/${article.slug}`} className={className}>
    {children}
  </Link>
);

const ArticleMeta = ({ article, compact = false }) => (
  <div className={`flex flex-wrap items-center gap-3 text-slate-500 ${compact ? "text-xs" : "text-sm"}`}>
    <span>By {getArticleAuthorName(article)}</span>
    <span>{getArticlePublishedLabel(article)}</span>
  </div>
);

const WhatsAppShareLink = ({ article, className = "" }) => (
  <a
    href={getWhatsAppShareLink({ slug: article.slug, title: article.title })}
    target="_blank"
    rel="noreferrer"
    aria-label={`Share ${article.title} on WhatsApp`}
    className={className}
  >
    <WhatsAppIcon className="h-4 w-4" />
  </a>
);

export const HomePage = () => {
  const [feed, setFeed] = useState(initialFeed);
  const [ads, setAds] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [latestPage, setLatestPage] = useState(1);
  const [feedLoading, setFeedLoading] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [tickerCycle, setTickerCycle] = useState(0);
  const featured = useMemo(() => {
    const breakingArticleIds = new Set(feed.breaking.map((article) => article._id));
    return feed.latest.find((article) => breakingArticleIds.has(article._id)) || feed.latest[0] || feed.breaking[0];
  }, [feed.breaking, feed.latest]);

  useEffect(() => {
    setFeedLoading(true);
    http
      .get("/articles/homepage/feed", { params: { date: selectedDate, page: latestPage } })
      .then(({ data }) => setFeed({ ...initialFeed, ...data }))
      .catch(() => setFeed(initialFeed))
      .finally(() => setFeedLoading(false));
  }, [latestPage, selectedDate]);

  useEffect(() => {
    http.get("/ads/active").then(({ data }) => setAds(data.ads)).catch(() => {});
  }, []);

  useEffect(() => {
    setLatestPage(1);
  }, [selectedDate]);

  useEffect(() => {
    if (!feed.breaking.length) return undefined;

    const restartTicker = () => {
      window.requestAnimationFrame(() => {
        setTickerCycle((value) => value + 1);
      });
    };

    restartTicker();
    window.addEventListener("resize", restartTicker);
    window.addEventListener("orientationchange", restartTicker);

    return () => {
      window.removeEventListener("resize", restartTicker);
      window.removeEventListener("orientationchange", restartTicker);
    };
  }, [feed.breaking.length]);

  const tickerItems = useMemo(() => {
    const items = [...feed.breaking].slice(0, 10);
    return [...items, ...items];
  }, [feed.breaking]);

  const adsByPlacement = useMemo(() => groupAdsByPlacement(ads), [ads]);
  const heroAds = adsByPlacement["homepage-hero"];
  const latestAds = adsByPlacement["homepage-latest"];
  const districtAds = adsByPlacement["homepage-district"];
  const visibleLatestArticles = useMemo(() => {
    if (!featured?._id) return feed.latest;
    return feed.latest.filter((article) => article._id !== featured._id).slice(0, 9);
  }, [featured?._id, feed.latest]);
  const voiceHighlights = useMemo(
    () =>
      feed.voiceHighlights.filter(
        (article) =>
          Boolean(String(article?.audioUrl || "").trim()) &&
          Number(article?.audioDuration || 0) > 0 &&
          ["voice", "hybrid"].includes(article?.storyFormat)
      ),
    [feed.voiceHighlights]
  );
  const shouldShowLatestSummary = feed.pagination.totalItems > 0;
  const currentPageArticleCount = feed.latest.length;
  const normalizedPageSize = feed.pagination.pageSize || 10;
  const normalizedTotalPages = Math.max(
    feed.pagination.totalPages || Math.ceil(feed.pagination.totalItems / normalizedPageSize),
    1
  );
  const hasMoreLatestArticles = Boolean(feed.pagination.hasNextPage);
  const isSinglePageDateResult = feed.isDateFiltered && feed.pagination.totalItems <= normalizedPageSize;

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-8">
      {showDateFilter ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/70 px-4 pb-6 pt-24 backdrop-blur-sm sm:items-center sm:pb-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-950/95 p-6 shadow-[0_32px_80px_rgba(15,23,42,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Date Filter</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Filter Homepage News</h2>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Leave the date empty to browse all published news, or choose a specific date to view that day&apos;s stories only.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDateFilter(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:text-white"
                aria-label="Close date filter"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400" htmlFor="homepage-date-filter">
                Select Date / तारीख चुनें
              </label>
              <input
                id="homepage-date-filter"
                type="date"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
              <p className="mt-3 text-xs leading-5 text-slate-400">
                English: Select a date only when you want to filter the homepage for one publishing day.
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                हिंदी: किसी एक प्रकाशित तारीख की खबरें देखने के लिए ही तारीख चुनें।
              </p>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {selectedDate ? (
                <button
                  type="button"
                  onClick={() => setSelectedDate("")}
                  className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:border-orange-300/40 hover:text-orange-200"
                >
                  Clear Filter
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setShowDateFilter(false)}
                className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setShowDateFilter(true)}
        className="fixed bottom-5 left-4 z-[60] inline-flex items-center gap-3 rounded-full border border-orange-300/30 bg-slate-950/95 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(15,23,42,0.35)] backdrop-blur transition hover:border-orange-300/60 hover:bg-slate-900 sm:bottom-6 sm:left-6"
        aria-label="Open homepage date filter"
      >
        <CalendarDays className="h-5 w-5 text-orange-300" />
        <span>{selectedDate ? `Date: ${selectedDate}` : "Filter News"}</span>
      </button>

      <section className="panel overflow-hidden p-4">
        <div className="flex items-center gap-4">
          <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white">
            Live Headlines
          </span>
            <div className="overflow-hidden">
            <div key={tickerCycle} className="ticker-track flex gap-8 whitespace-nowrap">
              {tickerItems.map((article, index) => (
                <Link key={`${article._id}-${index}`} to={`/article/${article.slug}`} className="text-sm text-slate-200">
                  {article.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
        <div className="panel overflow-hidden p-8">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Breaking Focus</p>
            <Link
              to="/advertise-with-us"
              className="inline-flex rounded-full border border-orange-300/35 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:border-orange-300/60 hover:bg-orange-500/20"
            >
              Advertise With Us
            </Link>
          </div>
          {featured ? (
            <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                {featured.audioUrl ? (
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
                    <Headphones size={14} />
                    Voice-enabled bulletin
                  </div>
                ) : null}
                <h1 className="max-w-3xl font-display text-4xl leading-tight text-white md:text-6xl">{featured.title}</h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">{featured.excerpt}</p>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  <span>{featured.district}</span>
                  <span>{featured.area}</span>
                  <ArticleMeta article={featured} />
                  <WhatsAppShareLink
                    article={featured}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-500/10 text-emerald-300 transition hover:border-emerald-300/50 hover:bg-emerald-500/20 hover:text-emerald-200"
                  />
                </div>
                {featured.audioUrl ? <AudioStoryPlayer article={featured} compact className="mt-6 max-w-xl" /> : null}
                <Link to={`/article/${featured.slug}`} className="mt-6 inline-flex rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white">
                  Read Featured Story
                </Link>
              </div>
              {featured.coverImageUrl ? (
                <StoryImage src={featured.coverImageUrl} alt={featured.title} className="h-72 w-full" />
              ) : (
                <div className="h-72 rounded-3xl bg-gradient-to-br from-orange-500/25 via-slate-800 to-slate-900" />
              )}
            </div>
          ) : (
            <>
              <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight text-white md:text-6xl">
                Palamu Express reporting built for every district, block, and newsroom workflow in Jharkhand.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
                Fast-loading local coverage, editorial approval flows, AI summaries, advertiser inventory, and live analytics.
              </p>
            </>
          )}
        </div>

        <div className="space-y-6">
          <div className="panel p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">Breaking News</h2>
              <span className="animate-pulse rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-white">
                Live
              </span>
            </div>
            <div className="mt-5 space-y-4">
              {feed.breaking.map((article) => (
                <StoryListLink
                  key={article._id}
                  article={article}
                  className="block rounded-2xl border-b border-white/10 pb-4 transition hover:bg-white/[0.03] last:border-b-0"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-orange-300">{article.district}{article.audioUrl ? " • Voice" : ""}</p>
                  <p className="mt-2 text-white hover:text-orange-200">{article.title}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <ArticleMeta article={article} compact />
                    <WhatsAppShareLink
                      article={article}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-500/10 text-emerald-300 transition hover:border-emerald-300/40 hover:bg-emerald-500/20"
                    />
                  </div>
                </StoryListLink>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {heroAds.length ? (
              heroAds.map((ad) => <AdCard key={ad._id} ad={ad} compact />)
            ) : (
              <EmptyAdSlot
                title="Premium homepage sponsor rail"
                description="This reserved sponsor space sits beside the lead news block so core reading flow stays intact."
              />
            )}
          </div>
        </div>
      </section>

      {voiceHighlights.length ? (
        <section className="panel overflow-hidden p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Live Audio Desk</p>
              <h2 className="mt-2 section-title">Voice Bulletins</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Newly published voice news is available here for quick listening without leaving the homepage.
              </p>
            </div>
            <div className="rounded-full border border-emerald-300/25 bg-emerald-500/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-emerald-200">
              Listen instantly
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {voiceHighlights.map((article) => (
              <div key={article._id} className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
                      {article.district} • {article.area}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-white">{article.title}</h3>
                    <div className="mt-3">
                      <ArticleMeta article={article} compact />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-orange-300">
                      {article.storyFormat || "voice"}
                    </span>
                    <WhatsAppShareLink
                      article={article}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-500/10 text-emerald-300 transition hover:border-emerald-300/50 hover:bg-emerald-500/20"
                    />
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{article.excerpt}</p>
                <AudioStoryPlayer article={article} compact className="mt-4" />
                <Link to={`/article/${article.slug}`} className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-900">
                  Open Voice Story
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="section-title">Latest Updates</h2>
            {feed.isDateFiltered && feed.effectiveDate ? (
              <p className="mt-2 text-sm text-slate-400">
                Showing {currentPageArticleCount} article{currentPageArticleCount === 1 ? "" : "s"} on this page for published date {feed.effectiveDate}. Page {feed.pagination.page} of {normalizedTotalPages}.
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-400">
                Showing {currentPageArticleCount} article{currentPageArticleCount === 1 ? "" : "s"} on this page. The first article appears as the featured story above, and any remaining articles appear below. Page {feed.pagination.page} of {normalizedTotalPages}.
              </p>
            )}
          </div>
          <div className="rounded-full border border-dashed border-orange-300/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-orange-200">
            Sponsor placements ordered by priority
          </div>
        </div>

        {latestAds.length ? (
          <div className="mb-6 grid gap-5 md:grid-cols-2">
            {latestAds.map((ad) => (
              <AdCard key={ad._id} ad={ad} />
            ))}
          </div>
        ) : (
          <div className="mb-6">
            <EmptyAdSlot
              title="Latest section sponsor placement"
              description="Reserved for sponsored campaigns that should appear between headline groups without crowding the news cards."
            />
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleLatestArticles.map((article) => (
            <NewsCard key={article._id} article={article} />
          ))}
        </div>
        {shouldShowLatestSummary ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-400">
              {feed.pagination.totalItems} article{feed.pagination.totalItems === 1 ? "" : "s"} found {feed.isDateFiltered && feed.effectiveDate ? `for ${feed.effectiveDate}` : "across all published news"}.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={!feed.pagination.hasPreviousPage || feedLoading}
                onClick={() => setLatestPage((value) => Math.max(1, value - 1))}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-slate-400">
                Page {feed.pagination.page} of {normalizedTotalPages}
              </span>
              <button
                type="button"
                disabled={!hasMoreLatestArticles || feedLoading || isSinglePageDateResult}
                onClick={() => setLatestPage((value) => value + 1)}
                className="rounded-full bg-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(249,115,22,0.22)] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {feedLoading ? "Loading..." : "More News"}
              </button>
            </div>
          </div>
        ) : null}
        {!visibleLatestArticles.length && !featured ? (
          <div className="panel mt-6 p-6">
            <p className="text-lg font-semibold text-white">
              {feed.isDateFiltered ? `No published news found for ${selectedDate}.` : "No published news is available yet."}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {feed.isDateFiltered
                ? "Try another date or clear the date filter to return to the full published news feed."
                : "As soon as editors publish new stories, they will appear here automatically."}
            </p>
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="panel p-6 lg:col-span-1">
          <h2 className="section-title">Trending</h2>
          <div className="mt-5 space-y-4">
            {feed.trending.map((article, index) => (
              <StoryListLink
                key={article._id}
                article={article}
                className="flex gap-4 rounded-2xl border-b border-white/10 pb-4 transition hover:bg-white/[0.03] last:border-b-0"
              >
                <span className="text-3xl font-display text-orange-300">{String(index + 1).padStart(2, "0")}</span>
                <div className="flex-1">
                  <p className="text-sm text-slate-500">{article.district}</p>
                  <p className="text-white hover:text-orange-200">{article.title}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <ArticleMeta article={article} compact />
                    <WhatsAppShareLink
                      article={article}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-500/10 text-emerald-300 transition hover:border-emerald-300/40 hover:bg-emerald-500/20"
                    />
                  </div>
                </div>
              </StoryListLink>
            ))}
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {districtAds.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {districtAds.map((ad) => (
                <AdCard key={ad._id} ad={ad} />
              ))}
            </div>
          ) : (
            <EmptyAdSlot
              title="District coverage sponsor strip"
              description="Lower-page sponsor inventory lives here so long-form district browsing remains comfortable and readable."
            />
          )}

          <div>
            <h2 className="section-title mb-5">District-wise News</h2>
            <div className="space-y-6">
              {feed.districtWise.map((group) => (
                <div key={group.district} className="panel p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-white">{group.district}</h3>
                    <span className="text-sm text-slate-500">Local desk</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {group.articles.map((article) => (
                      <StoryListLink key={article._id} article={article} className="rounded-2xl border border-white/10 p-4 transition hover:border-orange-400/40 hover:bg-white/[0.03]">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{article.area}{article.audioUrl ? " • Voice" : ""}</p>
                        <p className="mt-2 text-white hover:text-orange-200">{article.title}</p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <ArticleMeta article={article} compact />
                          <WhatsAppShareLink
                            article={article}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-500/10 text-emerald-300 transition hover:border-emerald-300/40 hover:bg-emerald-500/20"
                          />
                        </div>
                      </StoryListLink>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
