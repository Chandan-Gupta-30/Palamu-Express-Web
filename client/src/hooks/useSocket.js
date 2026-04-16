import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export const useSocket = (slug) => {
  const [pageViews, setPageViews] = useState(0);

  useEffect(() => {
    if (!slug) return undefined;

    const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000");
    socket.emit("analytics:join", slug);
    socket.on("analytics:update", (payload) => {
      if (payload.slug === slug) {
        setPageViews(payload.pageViews);
      }
    });

    return () => socket.disconnect();
  }, [slug]);

  return { pageViews };
};
