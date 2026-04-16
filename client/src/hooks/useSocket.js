import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { runtimeConfig } from "../config/runtime";

export const useSocket = (slug) => {
  const [pageViews, setPageViews] = useState(0);

  useEffect(() => {
    if (!slug) return undefined;

    const socket = io(runtimeConfig.socketUrl);
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
