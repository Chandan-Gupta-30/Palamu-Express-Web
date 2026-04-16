import { CheckCircle2, LoaderCircle, TriangleAlert, X } from "lucide-react";

const popupToneMap = {
  loading: {
    icon: LoaderCircle,
    iconClassName: "animate-spin text-orange-200",
    badgeClassName: "border-orange-300/25 bg-orange-500/15 text-orange-200",
    panelClassName: "border-orange-300/20 bg-slate-950/95",
  },
  success: {
    icon: CheckCircle2,
    iconClassName: "text-emerald-300",
    badgeClassName: "border-emerald-300/25 bg-emerald-500/15 text-emerald-200",
    panelClassName: "border-emerald-300/20 bg-slate-950/95",
  },
  error: {
    icon: TriangleAlert,
    iconClassName: "text-rose-300",
    badgeClassName: "border-rose-300/25 bg-rose-500/15 text-rose-200",
    panelClassName: "border-rose-300/20 bg-slate-950/95",
  },
};

export const ActionPopup = ({
  open,
  type = "loading",
  title,
  message,
  onClose,
  closeLabel = "Close",
  persistent = false,
}) => {
  if (!open) return null;

  const tone = popupToneMap[type] || popupToneMap.loading;
  const Icon = tone.icon;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/72 px-4 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-[30px] border p-6 shadow-[0_32px_90px_rgba(15,23,42,0.45)] ${tone.panelClassName}`}>
        <div className="flex items-start justify-between gap-4">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${tone.badgeClassName}`}>
            <Icon className={`h-4 w-4 ${tone.iconClassName}`} />
            <span>{type === "loading" ? "Processing" : type}</span>
          </div>
          {!persistent && onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:text-white"
              aria-label="Close popup"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        <div className="mt-5 flex items-start gap-4">
          <div className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] ${type === "loading" ? "animate-pulse" : ""}`}>
            <Icon className={`h-7 w-7 ${tone.iconClassName}`} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{message}</p>
          </div>
        </div>

        {!persistent && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            {closeLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
};
