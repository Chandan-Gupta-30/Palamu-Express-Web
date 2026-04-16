import { useLocation } from "react-router-dom";

const whatsappChannelUrl = import.meta.env.VITE_WHATSAPP_CHANNEL_URL;

const WhatsAppIcon = ({ className = "h-5 w-5" }) => (
  <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M19.11 17.34c-.27-.14-1.61-.79-1.86-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.31.2-.58.07-.27-.14-1.12-.41-2.14-1.31-.79-.7-1.33-1.56-1.49-1.83-.16-.27-.02-.41.12-.55.12-.12.27-.31.41-.47.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.47-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.61-.47h-.52c-.18 0-.47.07-.72.34-.25.27-.95.93-.95 2.26 0 1.33.97 2.62 1.11 2.8.14.18 1.91 2.91 4.64 4.08.65.28 1.16.45 1.56.58.66.21 1.25.18 1.72.11.53-.08 1.61-.66 1.84-1.3.23-.63.23-1.17.16-1.29-.07-.11-.25-.18-.52-.32Z" />
    <path d="M16 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.59 4.46 1.71 6.4L3.2 28.8l6.55-1.68A12.75 12.75 0 0 0 16 28.8c7.06 0 12.8-5.74 12.8-12.8S23.06 3.2 16 3.2Zm0 23.3c-1.95 0-3.86-.53-5.52-1.53l-.4-.24-3.89 1 1.04-3.8-.26-.39a10.3 10.3 0 0 1-1.6-5.54c0-5.86 4.77-10.63 10.63-10.63 2.84 0 5.52 1.11 7.53 3.11a10.57 10.57 0 0 1 3.1 7.52c0 5.86-4.77 10.63-10.63 10.63Z" />
  </svg>
);

export const WhatsAppChannelButton = () => {
  const location = useLocation();

  if (!whatsappChannelUrl) {
    return null;
  }

  const isDashboard = location.pathname.startsWith("/dashboard");

  return (
    <a
      href={whatsappChannelUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="Join our WhatsApp channel"
      className={`fixed right-4 z-[55] inline-flex items-center gap-3 rounded-full border border-emerald-300/25 bg-[linear-gradient(135deg,rgba(22,163,74,0.98),rgba(5,150,105,0.95))] px-4 py-3 text-sm font-semibold text-white shadow-[0_22px_55px_rgba(5,150,105,0.34)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_70px_rgba(5,150,105,0.42)] focus:outline-none focus:ring-2 focus:ring-emerald-300/60 sm:right-6 ${
        isDashboard ? "bottom-24 sm:bottom-28" : "bottom-5 sm:bottom-6"
      }`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/16 ring-1 ring-white/20 backdrop-blur">
        <WhatsAppIcon className="h-5 w-5" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[11px] uppercase tracking-[0.22em] text-emerald-50/80">WhatsApp</span>
        <span>Join Channel</span>
      </span>
    </a>
  );
};
