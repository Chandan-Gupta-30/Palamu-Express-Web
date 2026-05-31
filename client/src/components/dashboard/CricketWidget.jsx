import { useEffect, useState, useRef } from "react";
import { Trophy, Target, TrendingUp, Tv, Loader2 } from "lucide-react";

export const CricketWidget = () => {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSimulated, setIsSimulated] = useState(false);

  // Live simulation state variables in Hindi
  const simStateRef = useRef({
    runs: 162,
    wickets: 4,
    overs: 18.0,
    ballsThisOver: [],
    target: 191,
    batsman1: { name: "विराट कोहली", runs: 74, balls: 41, strike: true },
    batsman2: { name: "हार्दिक पांड्या", runs: 12, balls: 8, strike: false },
    bowler: { name: "मिशेल स्टार्क", overs: 3.0, maidens: 0, runs: 32, wickets: 2 },
    commentary: "मिशेल स्टार्क रोमांचक अंतिम ओवरों की शुरुआत करने के लिए तैयार हैं।"
  });

  const [simState, setSimState] = useState({ ...simStateRef.current });

  const translateToHindi = (text) => {
    if (!text) return "";
    let tr = text;
    
    // Replace common team names
    tr = tr.replace(/India/gi, "भारत");
    tr = tr.replace(/Australia/gi, "ऑस्ट्रेलिया");
    tr = tr.replace(/England/gi, "इंग्लैंड");
    tr = tr.replace(/Pakistan/gi, "पाकिस्तान");
    tr = tr.replace(/South Africa/gi, "दक्षिण अफ्रीका");
    tr = tr.replace(/New Zealand/gi, "न्यूजीलैंड");
    tr = tr.replace(/Sri Lanka/gi, "श्रीलंका");
    tr = tr.replace(/Bangladesh/gi, "बांग्लादेश");
    tr = tr.replace(/West Indies/gi, "वेस्टइंडीज");
    tr = tr.replace(/Afghanistan/gi, "अफगानिस्तान");
    tr = tr.replace(/Ireland/gi, "आयरलैंड");
    tr = tr.replace(/Zimbabwe/gi, "जिम्बाब्वे");
    
    // Replace cricket verbs and nouns
    tr = tr.replace(/won by (\d+) wickets/gi, "ने $1 विकेटों से मैच जीता!");
    tr = tr.replace(/won by (\d+) runs/gi, "ने $1 रनों से मुकाबला जीता!");
    tr = tr.replace(/won the toss and opted to bat/gi, "ने टॉस जीतकर पहले बल्लेबाजी का फैसला किया");
    tr = tr.replace(/won the toss and opted to bowl/gi, "ने टॉस जीतकर पहले गेंदबाजी का फैसला किया");
    tr = tr.replace(/opted to bat/gi, "ने पहले बल्लेबाजी चुनी");
    tr = tr.replace(/opted to bowl/gi, "ने पहले गेंदबाजी चुनी");
    tr = tr.replace(/needs (\d+) runs/gi, "को जीत के लिए $1 रन चाहिए");
    tr = tr.replace(/in (\d+) balls/gi, "$1 गेंदों में");
    tr = tr.replace(/to win/gi, "");
    tr = tr.replace(/Yet to bat/gi, "बल्लेबाजी बाकी");
    tr = tr.replace(/over/gi, "ओवर");
    tr = tr.replace(/overs/gi, "ओवर");
    tr = tr.replace(/Match started/gi, "मैच शुरू हुआ");
    tr = tr.replace(/Match ended/gi, "मैच समाप्त");
    tr = tr.replace(/won/gi, "ने जीता");
    tr = tr.replace(/vs/gi, "बनाम");
    
    return tr;
  };

  const fetchLiveScore = async () => {
    try {
      const apiKey = import.meta.env.VITE_CRICKET_API_KEY;
      if (apiKey && apiKey.trim() !== "") {
        // Fetch real-time live cricket scores from CricAPI
        const res = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}`);
        if (!res.ok) throw new Error("Cricket API offline");
        const json = await res.json();
        
        const matches = json.data || [];
        const liveMatch = matches.find(m => m.matchStarted && !m.matchEnded && 
          (m.teams.some(t => t.toLowerCase().includes("india") || t.toLowerCase().includes("ind")) || true)
        ) || matches[0];

        if (liveMatch) {
          setIsSimulated(false);
          const score1 = liveMatch.score?.[0] || { r: 0, w: 0, o: 0 };
          const score2 = liveMatch.score?.[1] || { r: 0, w: 0, o: 0 };
          
          setMatch({
            title: translateToHindi(liveMatch.name),
            status: translateToHindi(liveMatch.status),
            venue: translateToHindi(liveMatch.venue) || "स्टेडियम",
            team1: translateToHindi(liveMatch.teams[0]),
            team2: translateToHindi(liveMatch.teams[1]),
            score1: `${score1.r}/${score1.w} (${score1.o} ओवर)`,
            score2: score2.r ? `${score2.r}/${score2.w} (${score2.o} ओवर)` : "बल्लेबाजी बाकी",
            runRate: score1.o > 0 ? (score1.r / score1.o).toFixed(2) : "0.00"
          });
          setLoading(false);
          setError(null);
          return;
        }
      }
      triggerSimulation();
    } catch (e) {
      console.warn("Failed to fetch live scores, falling back to simulation.", e);
      triggerSimulation();
    }
  };

  const triggerSimulation = () => {
    setIsSimulated(true);
    setMatch({
      title: "भारत बनाम ऑस्ट्रेलिया • टी20 विश्व कप फाइनल",
      status: "भारत को जीत के लिए 12 गेंदों में 29 रनों की आवश्यकता है!",
      venue: "नरेंद्र मोदी स्टेडियम, अहमदाबाद",
      team1: "ऑस्ट्रेलिया",
      team2: "भारत",
      score1: "190/6 (20 ओवर)",
      score2: `${simStateRef.current.runs}/${simStateRef.current.wickets} (${simStateRef.current.overs.toFixed(1)} ओवर)`,
      runRate: (simStateRef.current.runs / simStateRef.current.overs).toFixed(2)
    });
    setLoading(false);
    setError(null);
  };

  useEffect(() => {
    if (!isSimulated || loading) return;

    const interval = setInterval(() => {
      const state = simStateRef.current;
      
      if (state.overs >= 20 || state.runs >= state.target) {
        clearInterval(interval);
        return;
      }

      let currentOvers = Math.floor(state.overs);
      let currentBalls = Math.round((state.overs - currentOvers) * 10) + 1;
      
      if (currentBalls >= 6) {
        currentOvers += 1;
        currentBalls = 0;
        state.ballsThisOver = [];
        state.bowler.overs = Math.floor(state.bowler.overs) + 1;
      } else {
        state.overs = currentOvers + (currentBalls / 10);
        state.bowler.overs = Math.floor(state.bowler.overs) + (currentBalls / 10);
      }
      
      const outcomes = ["0", "1", "2", "4", "6", "W", "Wd", "Nb"];
      const weights = [0.15, 0.35, 0.15, 0.15, 0.1, 0.05, 0.03, 0.02];
      
      let r = Math.random();
      let index = 0;
      let sum = 0;
      for (let i = 0; i < weights.length; i++) {
        sum += weights[i];
        if (r <= sum) {
          index = i;
          break;
        }
      }
      
      const outcome = outcomes[index];
      let runsGained = 0;
      let extra = "";
      
      if (outcome === "0") {
        state.commentary = `कोई रन नहीं! ${state.bowler.name} की शानदार गेंद, ${state.batsman1.strike ? state.batsman1.name : state.batsman2.name} पूरी तरह बीट हुए।`;
      } else if (outcome === "1") {
        runsGained = 1;
        state.commentary = `सिंगल! हल्के हाथों से ड्राइव करके एक रन पूरा किया, स्ट्राइक रोटेट हुई।`;
      } else if (outcome === "2") {
        runsGained = 2;
        state.commentary = `तेज दौड़! फील्डर के आने से पहले बेहतरीन तालमेल के साथ दो रन पूरे किए!`;
      } else if (outcome === "4") {
        runsGained = 4;
        state.commentary = `चौका!!! बेहतरीन शॉट! गेंद सीधा बाउंड्री लाइन के बाहर चार रनों के लिए!`;
      } else if (outcome === "6") {
        runsGained = 6;
        state.commentary = `छक्का!!! गगनचुंबी शॉट! ${state.batsman1.strike ? state.batsman1.name : state.batsman2.name} ने गेंद को दर्शकों के बीच छह रनों के लिए भेजा!`;
      } else if (outcome === "W") {
        state.wickets += 1;
        state.ballsThisOver.push("W");
        state.commentary = `बड़ा विकेट!!! मिशेल स्टार्क ने एक शानदार यॉर्कर फेंककर क्लीन बोल्ड कर दिया!`;
        if (state.batsman1.strike) {
          state.batsman1 = { name: "रवींद्र जडेजा", runs: 0, balls: 0, strike: true };
        } else {
          state.batsman2 = { name: "रवींद्र जडेजा", runs: 0, balls: 0, strike: false };
        }
      } else if (outcome === "Wd") {
        runsGained = 1;
        extra = "Wd";
        state.commentary = `वाइड गेंद! लेग स्टंप से काफी बाहर, एक अतिरिक्त रन मिला।`;
      } else if (outcome === "Nb") {
        runsGained = 1;
        extra = "Nb";
        state.commentary = `नो बॉल! गेंदबाज ने क्रीज से पैर बाहर निकाला, अब फ्री हिट मिलेगी!`;
      }

      if (outcome !== "W") {
        state.runs += runsGained;
        state.ballsThisOver.push(extra || outcome);
        
        const activeBatsman = state.batsman1.strike ? state.batsman1 : state.batsman2;
        if (!extra) {
          activeBatsman.runs += runsGained;
          activeBatsman.balls += 1;
        }

        if (runsGained % 2 === 1 && !extra) {
          state.batsman1.strike = !state.batsman1.strike;
          state.batsman2.strike = !state.batsman2.strike;
        }
      }

      if (currentBalls === 0) {
        state.commentary += ` ओवर समाप्त हुआ।`;
        state.batsman1.strike = !state.batsman1.strike;
        state.batsman2.strike = !state.batsman2.strike;
      }

      let status = "";
      const ballsLeft = Math.round((20 - state.overs) * 6);
      const runsNeeded = state.target - state.runs;

      if (state.runs >= state.target) {
        status = "🎉 भारत ने ऑस्ट्रेलिया को " + (10 - state.wickets) + " विकेटों से हराया! भारत विश्व चैंपियन बना!";
      } else if (state.overs >= 20 || state.wickets >= 10) {
        status = `ऑस्ट्रेलिया ने रोमांचक मुकाबले में ${state.target - state.runs - 1} रनों से जीत हासिल की!`;
      } else {
        status = `भारत को जीत के लिए ${ballsLeft} गेंदों में ${runsNeeded} रनों की आवश्यकता है!`;
      }

      simStateRef.current = { ...state };
      setSimState({ ...state });
      
      setMatch(m => ({
        ...m,
        score2: `${state.runs}/${state.wickets} (${state.overs.toFixed(1)} ओवर)`,
        status,
        runRate: state.overs > 0 ? (state.runs / state.overs).toFixed(2) : "0.00"
      }));
    }, 10000);

    return () => clearInterval(interval);
  }, [isSimulated, loading]);

  useEffect(() => {
    fetchLiveScore();
    const refreshInterval = setInterval(fetchLiveScore, 60000);
    return () => clearInterval(refreshInterval);
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-[360px] mx-auto rounded-[28px] border border-white/10 border-t-white/20 border-l-white/20 bg-slate-900/10 backdrop-blur-2xl flex items-center justify-center gap-3 p-5 shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
        <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
        <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">लाइव स्कोर लोड हो रहा है...</span>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="w-full max-w-[360px] mx-auto rounded-[28px] border border-rose-500/10 border-t-rose-500/20 border-l-rose-500/20 bg-rose-950/5 backdrop-blur-2xl flex items-center justify-center p-5 shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
        <span className="text-xs text-rose-400 font-semibold tracking-wider">स्कोर सेंटर अस्थायी रूप से ऑफलाइन है</span>
      </div>
    );
  }

  return (
    <div 
      className="group relative overflow-hidden rounded-[28px] border border-white/10 border-t-white/25 border-l-white/25 bg-slate-900/25 p-5 backdrop-blur-3xl transition-all duration-500 hover:-translate-y-1.5 hover:-rotate-1 hover:scale-[1.03] flex flex-col justify-between w-full max-w-[360px] mx-auto shadow-[0_20px_40px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.45)] shadow-[0_8px_40px_rgba(59,130,246,0.08)] border-blue-500/10"
    >
      <style>{`
        @keyframes cricket-marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-cricket-marquee {
          display: inline-block;
          white-space: nowrap;
          animation: cricket-marquee 12s linear infinite;
          padding-left: 10px;
        }
      `}</style>

      {/* Live Badge and Title (Wrapping enabled to prevent cropping, tracking removed for beautiful Hindi shirorekha join) */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-1.5 text-slate-400 min-w-0 flex-1">
          <Trophy size={13} className="text-blue-500 animate-pulse mt-0.5 flex-shrink-0" />
          <span className="text-[10px] font-bold text-slate-300 break-words leading-tight" title={match.title}>
            {match.title}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full animate-pulse">
            लाइव
          </span>
        </div>
      </div>

      {/* Scores Grid */}
      <div className="mt-3 grid grid-cols-2 gap-2 border-b border-white/5 pb-2.5">
        <div className="space-y-0.5">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{match.team1}</p>
          <p className="text-sm font-extrabold text-slate-300 tracking-tight">{match.score1}</p>
        </div>
        <div className="space-y-0.5 border-l border-white/5 pl-3">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{match.team2} *</p>
          <p className="text-sm font-extrabold text-white tracking-tight animate-pulse">{match.score2}</p>
        </div>
      </div>

      {/* Live Commentary / Target status */}
      <div className="mt-2.5 space-y-1">
        <div className="flex items-center gap-1 text-[10px] text-sky-400 font-bold">
          <Target size={11} className="text-sky-400 animate-bounce flex-shrink-0" />
          <span className="break-words leading-tight">{match.status}</span>
        </div>
        
        {isSimulated ? (
          <div className="bg-slate-950/20 rounded-xl p-2 border border-white/5">
            {/* Simulated Active Players */}
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
              <span className={simState.batsman1.strike ? "text-white font-bold" : ""}>
                {simState.batsman1.name} {simState.batsman1.runs}({simState.batsman1.balls}){simState.batsman1.strike ? "*" : ""}
              </span>
              <span className={simState.batsman2.strike ? "text-white font-bold" : ""}>
                {simState.batsman2.name} {simState.batsman2.runs}({simState.batsman2.balls}){simState.batsman2.strike ? "*" : ""}
              </span>
            </div>
            
            {/* Ball-by-ball analysis */}
            <div className="mt-1.5 flex items-center justify-between border-t border-white/5 pt-1.5">
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-slate-500 font-bold">यह ओवर:</span>
                <div className="flex gap-1">
                  {simState.ballsThisOver.map((b, idx) => {
                    let bg = "bg-white/10 text-white";
                    if (["4", "6"].includes(b)) bg = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-black";
                    if (b === "W") bg = "bg-red-500/25 text-red-400 border border-red-500/35 font-black";
                    if (["Wd", "Nb"].includes(b)) bg = "bg-amber-500/20 text-amber-400 border border-amber-500/20";
                    return (
                      <span key={idx} className={`h-3.5 w-3.5 rounded-full flex items-center justify-center text-[8px] ${bg}`}>
                        {b}
                      </span>
                    );
                  })}
                </div>
              </div>
              <p className="text-[9px] text-slate-500 font-bold">रन रेट: {match.runRate}</p>
            </div>
            
            {/* Scrolling Commentary Marquee (Prevents eye strain, displays full commentary cleanly) */}
            <div className="overflow-hidden w-full relative h-7 mt-1.5 border-t border-white/5 py-1 flex items-center bg-black/10 rounded-lg">
              <div className="animate-cricket-marquee text-[10px] text-slate-300 font-medium leading-normal">
                {translateToHindi(simState.commentary)}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 pt-0.5 text-[9px] text-slate-400 font-bold">
            <span className="flex items-center gap-1">
              <TrendingUp size={10} className="text-slate-500" />
              रन रेट: {match.runRate}
            </span>
            <span className="flex items-center gap-1 truncate max-w-[200px]" title={match.venue}>
              <Tv size={10} className="text-slate-500" />
              {match.venue}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

