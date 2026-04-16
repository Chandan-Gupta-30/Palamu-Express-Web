import { Copy, Facebook, MessageCircleMore, Share2 } from "lucide-react";

export const ShareBar = ({ url, title }) => {
  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    x: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  };

  return (
    <div className="flex flex-wrap gap-3">
      <a href={shareLinks.whatsapp} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-4 py-2 text-sm">
        <MessageCircleMore className="mr-2 inline" size={16} />
        WhatsApp
      </a>
      <a href={shareLinks.facebook} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-4 py-2 text-sm">
        <Facebook className="mr-2 inline" size={16} />
        Facebook
      </a>
      <a href={shareLinks.x} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 px-4 py-2 text-sm">
        <Share2 className="mr-2 inline" size={16} />
        X
      </a>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(url)}
        className="rounded-full border border-white/10 px-4 py-2 text-sm"
      >
        <Copy className="mr-2 inline" size={16} />
        Copy Link
      </button>
    </div>
  );
};

