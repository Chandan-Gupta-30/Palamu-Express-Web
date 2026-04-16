import { normalizeWaveformBars } from "../../utils/audio";

export const AudioWaveform = ({
  waveform = [],
  active = false,
  compact = false,
  className = "",
}) => {
  const bars = normalizeWaveformBars(waveform, compact ? 24 : 36);

  return (
    <div
      className={`flex h-16 items-end gap-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-3 ${className}`}
      aria-hidden="true"
    >
      {bars.map((value, index) => (
        <span
          key={`${index}-${value}`}
          className={`block flex-1 rounded-full transition-all duration-300 ${
            active ? "bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.35)]" : "bg-orange-300/80"
          }`}
          style={{
            minHeight: compact ? "10px" : "12px",
            height: `${Math.max(14, value * (compact ? 40 : 52))}px`,
            opacity: active ? 0.55 + ((index % 5) / 10) : 0.85,
            transformOrigin: "center bottom",
            transform: active ? `scaleY(${1 + ((index % 4) * 0.02)})` : "scaleY(1)",
          }}
        />
      ))}
    </div>
  );
};
