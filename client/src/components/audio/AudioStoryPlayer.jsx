import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Volume2 } from "lucide-react";
import { AudioWaveform } from "./AudioWaveform";
import { formatAudioDuration, normalizeWaveformBars } from "../../utils/audio";

export const AudioStoryPlayer = ({
  article,
  title,
  compact = false,
  className = "",
}) => {
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(Number(article?.audioDuration) || 0);
  const [liveWaveform, setLiveWaveform] = useState([]);
  const label = title || article?.title || "Voice bulletin";
  const hasAudio = Boolean(article?.audioUrl);

  const fallbackWaveform = useMemo(() => article?.audioWaveform || [], [article?.audioWaveform]);
  const waveform = liveWaveform.length ? liveWaveform : fallbackWaveform;

  if (!hasAudio) return null;

  const stopAnalyser = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
  };

  const cleanupAudioAnalysis = () => {
    stopAnalyser();
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current = null;

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }

    audioContextRef.current = null;
  };

  const beginAudioAnalysis = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    stopAnalyser();

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      if (!sourceRef.current) {
        sourceRef.current = audioContextRef.current.createMediaElementSource(audio);
      }

      if (!analyserRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.82;
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }

      const analyser = analyserRef.current;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const sample = () => {
        analyser.getByteFrequencyData(dataArray);
        const sliceSize = Math.max(1, Math.floor(dataArray.length / 36));
        const nextWaveform = Array.from({ length: 36 }, (_, index) => {
          const start = index * sliceSize;
          const chunk = dataArray.slice(start, start + sliceSize);
          const average = chunk.reduce((sum, value) => sum + value, 0) / Math.max(chunk.length, 1);
          return Math.max(0.08, average / 255);
        });

        setLiveWaveform(normalizeWaveformBars(nextWaveform, compact ? 24 : 36));
        animationFrameRef.current = requestAnimationFrame(sample);
      };

      sample();
    } catch (_) {
      setLiveWaveform([]);
    }
  };

  useEffect(() => {
    setLiveWaveform([]);
    return () => {
      cleanupAudioAnalysis();
    };
  }, [article?.audioUrl]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    try {
      await audio.play();
      setPlaying(true);
    } catch (_) {
      setPlaying(false);
    }
  };

  return (
    <div className={`rounded-[28px] border border-white/10 bg-white/[0.04] p-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
            <Volume2 size={18} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Voice News</p>
            <p className={`font-semibold text-white ${compact ? "text-sm" : "text-base"}`}>{label}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={togglePlayback}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition ${
            playing ? "bg-emerald-600 hover:bg-emerald-500" : "bg-orange-500 hover:bg-orange-400"
          }`}
          aria-label={playing ? `Pause ${label}` : `Play ${label}`}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
          {playing ? "Pause" : "Play"}
        </button>
      </div>

      <AudioWaveform waveform={waveform} active={playing} compact={compact} className="mt-4" />

      <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
        <span>Recorded bulletin</span>
        <span>{formatAudioDuration(duration)}</span>
      </div>

      <audio
        ref={audioRef}
        src={article.audioUrl}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || Number(article?.audioDuration) || 0)}
        onEnded={() => {
          setPlaying(false);
          stopAnalyser();
          setLiveWaveform([]);
        }}
        onPause={() => {
          setPlaying(false);
          stopAnalyser();
          setLiveWaveform([]);
        }}
        onPlay={() => {
          setPlaying(true);
          beginAudioAnalysis();
        }}
        className="hidden"
      />
    </div>
  );
};
