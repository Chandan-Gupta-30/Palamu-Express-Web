import { useEffect, useState, useRef, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bookmark, User, Calendar, Eye, Play, Pause, Volume2, Square, SkipForward, SkipBack } from "lucide-react";
import { http } from "../api/http";
import { AudioStoryPlayer } from "../components/audio/AudioStoryPlayer";
import { ShareBar } from "../components/news/ShareBar";
import { ActionPopup } from "../components/ui/ActionPopup";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
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

const ActiveSentenceRenderer = ({ text, currentWordCharIndex }) => {
  const tokens = useMemo(() => {
    const regex = /([\u0900-\u097F\w]+)|([^\u0900-\u097F\w]+)/g;
    const result = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
      result.push({
        text: match[0],
        isWord: Boolean(match[1]),
        startIndex: match.index,
        endIndex: regex.lastIndex,
      });
    }
    return result;
  }, [text]);

  return (
    <>
      {tokens.map((token, idx) => {
        const isActive = token.isWord && 
          (currentWordCharIndex >= token.startIndex && currentWordCharIndex < token.endIndex);
        
        if (token.isWord) {
          return (
            <span
              key={idx}
              className={`rounded px-1 py-0.5 font-medium ${
                isActive
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-orange-100 bg-transparent"
              }`}
            >
              {token.text}
            </span>
          );
        } else {
          return (
            <span key={idx} className="text-orange-200/70">
              {token.text}
            </span>
          );
        }
      })}
    </>
  );
};

export const ArticlePage = () => {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
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

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentWordCharIndex, setCurrentWordCharIndex] = useState(-1);
  const [speechSpeed, setSpeechSpeed] = useState(1);
  
  const stateRef = useRef({ isPlaying: false, isPaused: false, currentSentenceIndex: 0, speechSpeed: 1, sentences: [] });
  const utteranceRef = useRef(null);

  // Helper to find a female Indian English or Hindi voice
  const getIndianFemaleVoice = (voices, isHindi = false) => {
    if (isHindi) {
      // Prioritize Hindi (India) voices
      const hindiVoices = voices.filter(
        (v) => v.lang.toLowerCase().includes("hi") || v.lang.toLowerCase().includes("hin")
      );
      
      // Prioritize female-sounding Hindi voices or high-quality Google Hindi voice
      const femaleKeywords = ["kalpana", "female", "girl", "woman", "हिन्दी", "google"];
      for (const kw of femaleKeywords) {
        const found = hindiVoices.find((v) => v.name.toLowerCase().includes(kw));
        if (found) return found;
      }
      
      if (hindiVoices.length > 0) {
        return hindiVoices[0];
      }
    }

    const indianVoices = voices.filter(
      (v) => v.lang.includes("IN") || v.lang.toLowerCase().includes("in")
    );
    
    // Prioritize female-sounding Indian voices
    const femaleKeywords = ["veena", "heera", "kalpana", "neerja", "zira", "female", "girl", "woman"];
    for (const kw of femaleKeywords) {
      const found = indianVoices.find((v) => v.name.toLowerCase().includes(kw));
      if (found) return found;
    }
    
    // Next, check if there's any Google / Microsoft Hindi voice (often high quality, often female)
    const hiGoogle = indianVoices.find((v) => v.name.toLowerCase().includes("google") && v.lang.includes("hi"));
    if (hiGoogle) return hiGoogle;
    
    // If no specific female voice keyword match, return the first Indian voice
    if (indianVoices.length > 0) {
      return indianVoices[0];
    }
    
    // Fallback to any general English female voice
    for (const kw of femaleKeywords) {
      const found = voices.find(
        (v) => v.name.toLowerCase().includes(kw) && v.lang.toLowerCase().startsWith("en")
      );
      if (found) return found;
    }
    
    return null;
  };

  // Detect if text is written in Hindi/Devanagari
  const isHindi = useMemo(() => {
    if (!article) return false;
    const text = article.content || article.audioTranscript || "";
    return /[\u0900-\u097F]/.test(text);
  }, [article]);

  // Structured sentence-level parsing
  const parsedStructure = useMemo(() => {
    if (!article) return { paragraphs: [], sentences: [] };
    
    const rawParagraphs = (article.content || article.audioTranscript || "")
      .split(/\n+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
      
    const paragraphs = [];
    const sentences = [];
    let sentenceGlobalIndex = 0;
    
    for (const rawP of rawParagraphs) {
      let rawSentences = [];
      try {
        rawSentences = rawP.split(/(?<=[.!?\u0964|])\s+/);
      } catch (e) {
        rawSentences = rawP.match(/[^.!?\u0964|]+[.!?\u0964|]+(?:\s|$)|[^.!?\u0964|]+$/g) || [rawP];
      }
      
      const pSentences = [];
      for (let sText of rawSentences) {
        sText = sText.trim();
        if (sText.length > 0) {
          const sentenceObj = {
            id: sentenceGlobalIndex++,
            text: sText,
          };
          sentences.push(sText);
          pSentences.push(sentenceObj);
        }
      }
      
      paragraphs.push({
        sentences: pSentences,
      });
    }
    
    return { paragraphs, sentences };
  }, [article]);

  const progressPercent = useMemo(() => {
    if (parsedStructure.sentences.length === 0) return 0;
    return (currentSentenceIndex / parsedStructure.sentences.length) * 100;
  }, [currentSentenceIndex, parsedStructure.sentences.length]);

  // Keep ref up to date
  useEffect(() => {
    stateRef.current = {
      isPlaying,
      isPaused,
      currentSentenceIndex,
      speechSpeed,
      sentences: parsedStructure.sentences,
    };
  }, [isPlaying, isPaused, currentSentenceIndex, speechSpeed, parsedStructure.sentences]);

  // Handle voices-changed event to pre-populate or trigger speechSynthesis voice listings
  useEffect(() => {
    const handleVoicesChanged = () => {
      window.speechSynthesis.getVoices();
    };
    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    // Trigger initially
    window.speechSynthesis.getVoices();
    
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      window.speechSynthesis.cancel();
    };
  }, []);

  const stopSpeech = () => {
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current.onboundary = null;
      utteranceRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentenceIndex(0);
    setCurrentWordCharIndex(-1);
  };

  const playSpeech = (startIndex = 0) => {
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current.onboundary = null;
      utteranceRef.current = null;
    }
    window.speechSynthesis.cancel();
    
    const targetSentences = stateRef.current.sentences;
    if (targetSentences.length === 0) return;

    let index = startIndex;
    if (index < 0) index = 0;
    if (index >= targetSentences.length) {
      stopSpeech();
      return;
    }

    setIsPlaying(true);
    setIsPaused(false);
    setCurrentSentenceIndex(index);
    setCurrentWordCharIndex(-1);

    // Smoothly scroll the highlighted sentence into view if it's out of the comfortable viewport area
    setTimeout(() => {
      const el = document.getElementById(`article-sentence-${index}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const buffer = viewportHeight * 0.3; // 30% buffer from top and bottom
        
        const isTooHigh = rect.top < buffer;
        const isTooLow = rect.bottom > (viewportHeight - buffer);
        
        if (isTooHigh || isTooLow) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }, 150);

    const textToSpeak = targetSentences[index];
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current = utterance; // Strong ref keeps it safe from GC!
    
    utterance.rate = stateRef.current.speechSpeed;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = getIndianFemaleVoice(voices, isHindi);
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onboundary = (event) => {
      if (event.name === "word") {
        setCurrentWordCharIndex(event.charIndex);
      }
    };

    utterance.onend = () => {
      const nextIndex = index + 1;
      const currentList = stateRef.current.sentences;
      if (nextIndex < currentList.length) {
        if (stateRef.current.isPlaying) {
          playSpeech(nextIndex);
        }
      } else {
        stopSpeech();
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== "interrupted") {
        console.error("SpeechSynthesisUtterance error:", e);
        stopSpeech();
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const togglePlayPause = () => {
    if (!isPlaying) {
      playSpeech(currentSentenceIndex);
    } else if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const handleSpeedChange = (newSpeed) => {
    setSpeechSpeed(newSpeed);
    if (isPlaying && !isPaused) {
      stateRef.current.speechSpeed = newSpeed;
      playSpeech(currentSentenceIndex);
    }
  };

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
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 animate-pulse">
        {/* Breadcrumb Skeleton */}
        <div className="h-4 w-32 bg-slate-800 rounded" />

        {/* Title and Meta Skeleton */}
        <div className="space-y-4 pt-4">
          <div className="h-4 w-24 bg-slate-800 rounded" />
          <div className="h-10 w-3/4 bg-slate-800 rounded md:h-12" />
          <div className="h-4 w-1/2 bg-slate-800 rounded" />
        </div>

        {/* Audio Player Skeleton */}
        <div className="panel p-5 space-y-3 bg-slate-900/10 border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-slate-800" />
            <div className="space-y-2">
              <div className="h-3 w-28 bg-slate-800 rounded" />
              <div className="h-4 w-48 bg-slate-800 rounded" />
            </div>
          </div>
        </div>

        {/* Cover Image Skeleton */}
        <div className="h-80 w-full bg-slate-800 rounded-3xl" />

        {/* Story Paragraphs Skeleton */}
        <div className="panel p-8 space-y-6 bg-slate-900/10 border-white/5">
          <div className="space-y-3">
            <div className="h-3.5 w-full bg-slate-800 rounded" />
            <div className="h-3.5 w-5/6 bg-slate-800 rounded" />
            <div className="h-3.5 w-4/5 bg-slate-800 rounded" />
          </div>
          <div className="space-y-3">
            <div className="h-3.5 w-full bg-slate-800 rounded" />
            <div className="h-3.5 w-11/12 bg-slate-800 rounded" />
            <div className="h-3.5 w-3/4 bg-slate-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  const articleUrl = getArticlePageUrl(slug);
  const whatsappPreviewUrl = getArticleSharePreviewUrl(slug);
  const isBookmarked = Boolean(user?.bookmarks?.some((item) => (item._id || item).toString() === article._id));
  const summaryLocked = Boolean(summary);
  const dashboardReturn = location.state?.dashboardReturn;

  const breadcrumbItems = [
    { label: article.title }
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Breadcrumbs items={breadcrumbItems} />
      <ActionPopup
        open={Boolean(actionPopup)}
        type={actionPopup?.type}
        title={actionPopup?.title}
        message={actionPopup?.message}
        persistent={actionPopup?.persistent}
        onClose={actionPopup?.persistent ? undefined : () => setActionPopup(null)}
      />
      {dashboardReturn ? (
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
              return;
            }

            navigate(dashboardReturn.path || "/dashboard");
          }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/5"
        >
          <ArrowLeft size={16} />
          {dashboardReturn.label || "Back to Dashboard"}
        </button>
      ) : null}
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-orange-300">
          {[article.district, article.area, article.panchayat].filter(Boolean).join(" • ")}
        </p>
        <h1 className="font-display text-4xl text-white md:text-5xl">{article.title}</h1>
        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-semibold text-slate-400">
          <span className="inline-flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md border border-white/5 text-slate-300">
            <User size={13} className="text-orange-400" />
            By {getArticleAuthorName(article)}
          </span>
          <span className="h-4 w-[1px] bg-slate-800 hidden sm:inline" />
          <span className="inline-flex items-center gap-1.5 text-slate-400">
            <Calendar size={13} className="text-slate-500" />
            Published: {getArticlePublishedLabel(article)}
          </span>
          <span className="h-4 w-[1px] bg-slate-800 hidden sm:inline" />
          <span className="inline-flex items-center gap-1.5 text-slate-400">
            <Eye size={13} className="text-slate-500" />
            {pageViews || article.pageViews} Views
          </span>
        </div>
      </div>

      {/* Top Audio Playback Control Bar */}
      {parsedStructure.sentences.length > 0 && (
        <div className="relative overflow-hidden flex flex-col rounded-2xl border border-white/10 bg-slate-900/60 audio-reader-box p-4 backdrop-blur-md">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlayPause}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/20 transition hover:scale-105 hover:bg-orange-400"
                aria-label={isPlaying && !isPaused ? "Pause listening" : "Listen to article"}
              >
                {isPlaying && !isPaused ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
              </button>
              <div>
                <h3 className="font-semibold text-white">Listen to this report</h3>
                <p className="text-xs text-slate-400">
                  {isPlaying
                    ? `Reading line ${currentSentenceIndex + 1} of ${parsedStructure.sentences.length}`
                    : "Professional Indian Accent Audio Reader"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {isPlaying && (
                <>
                  <select
                    value={speechSpeed}
                    onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                    className="rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 outline-none hover:border-white/20 cursor-pointer"
                  >
                    <option value="1">1.0x Speed</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="1.75">1.75x</option>
                    <option value="2">2.0x</option>
                  </select>
                  
                  <button
                    type="button"
                    onClick={stopSpeech}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-slate-800 text-slate-300 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/20 transition"
                    title="Stop listening"
                  >
                    <Square size={14} fill="currentColor" />
                  </button>
                </>
              )}
            </div>
          </div>
          
          {isPlaying && (
            <div className="absolute bottom-0 left-0 h-[3px] w-full bg-white/5">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-amber-300 transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}
        </div>
      )}

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
        <div className="mt-6 space-y-5">
          {parsedStructure.paragraphs.map((pObj, pIndex) => {
            const isParagraphActive = pObj.sentences.some((s) => isPlaying && currentSentenceIndex === s.id);
            return (
              <div
                key={pIndex}
                className={`relative rounded-2xl p-4 leading-8 border transition-colors duration-150 ${
                  isPlaying
                    ? isParagraphActive
                      ? "bg-orange-500/[0.04] border-orange-500/20 shadow-sm opacity-100"
                      : "border-transparent opacity-40"
                    : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {pObj.sentences.map((sObj) => {
                  const isSentenceActive = isPlaying && currentSentenceIndex === sObj.id;
                  return (
                    <span
                      key={sObj.id}
                      id={`article-sentence-${sObj.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        playSpeech(sObj.id);
                      }}
                      className={`inline cursor-pointer rounded px-1 py-0.5 border transition-colors duration-150 ${
                        isSentenceActive
                          ? "bg-orange-500/10 text-orange-100 font-medium border-orange-500/20"
                          : "border-transparent text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {isSentenceActive ? (
                        <ActiveSentenceRenderer
                          text={sObj.text}
                          currentWordCharIndex={currentWordCharIndex}
                        />
                      ) : (
                        sObj.text
                      )}
                      {" "}
                    </span>
                  );
                })}
              </div>
            );
          })}
          {parsedStructure.sentences.length === 0 && (
            <p className="text-slate-500 italic">This voice bulletin does not include written story notes yet.</p>
          )}
        </div>
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

      {/* Floating Control Bar that moves along the smooth scrolling */}
      {isPlaying && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col rounded-[24px] border border-orange-500/30 bg-slate-950/90 audio-floating-bar shadow-[0_20px_50px_rgba(249,115,22,0.2)] backdrop-blur-lg animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden min-w-[340px]">
          {/* Glowing Top Progress Bar */}
          <div className="h-1 w-full bg-white/10">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 transition-all duration-300 ease-out shadow-[0_0_8px_#f97316]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => playSpeech(Math.max(0, currentSentenceIndex - 1))}
                disabled={currentSentenceIndex === 0}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/5 bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous line"
              >
                <SkipBack size={14} />
              </button>

              <button
                type="button"
                onClick={togglePlayPause}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/20 transition hover:scale-105 hover:bg-orange-400"
                title={isPaused ? "Resume" : "Pause"}
              >
                {isPaused ? <Play size={18} className="ml-0.5" /> : <Pause size={18} />}
              </button>

              <button
                type="button"
                onClick={() => playSpeech(Math.min(parsedStructure.sentences.length - 1, currentSentenceIndex + 1))}
                disabled={currentSentenceIndex === parsedStructure.sentences.length - 1}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/5 bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next line"
              >
                <SkipForward size={14} />
              </button>
            </div>

            <div className="h-6 w-[1px] bg-white/10" />

            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-300 whitespace-nowrap">
                <span className="font-semibold text-orange-400">{currentSentenceIndex + 1}</span>
                <span className="text-slate-500"> / {parsedStructure.sentences.length}</span>
              </div>
              
              <select
                value={speechSpeed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="rounded-full border border-white/10 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 outline-none hover:border-white/20 cursor-pointer"
              >
                <option value="1">1.0x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="1.75">1.75x</option>
                <option value="2">2.0x</option>
              </select>

              <button
                type="button"
                onClick={stopSpeech}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition"
                title="Close & Stop"
              >
                <Square size={12} fill="currentColor" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
