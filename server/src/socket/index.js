import { verifyToken } from "../utils/jwt.js";

const broadcastLiveTraffic = (io) => {
  if (!io) return;
  const activeIps = new Set();
  const sockets = io.sockets?.sockets;
  if (sockets) {
    for (const [_, socket] of sockets) {
      let isReading = false;
      for (const room of socket.rooms) {
        if (room.startsWith("article:") || room === "public:site") {
          isReading = true;
          break;
        }
      }
      if (isReading) {
        const clientIp = socket.handshake.headers["x-forwarded-for"] || socket.handshake.address;
        activeIps.add(clientIp);
      }
    }
  }
  io.to("newsroom:analytics").emit("analytics:traffic-update", {
    liveVisitors: activeIps.size
  });
};

export const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    const authToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");

    // Broadcast traffic count update on connect
    setTimeout(() => broadcastLiveTraffic(io), 100);

    if (authToken) {
      try {
        const decoded = verifyToken(authToken);
        if (decoded?.id) {
          socket.join(`user:${decoded.id}`);
        }
      } catch (_) {
        // Ignore invalid socket auth and continue with public analytics events.
      }
    }

    socket.on("analytics:join", (slug) => {
      socket.join(`article:${slug}`);
      io.to(`article:${slug}`).emit("analytics:presence", { slug });
      broadcastLiveTraffic(io); // Broadcast traffic update immediately when user starts reading
    });

    socket.on("analytics:join-public", () => {
      socket.join("public:site");
      broadcastLiveTraffic(io); // Broadcast traffic update immediately when user enters public pages
    });

    socket.on("analytics:subscribe", () => {
      if (authToken) {
        try {
          const decoded = verifyToken(authToken);
          if (decoded?.id) {
            socket.join("newsroom:analytics");
            
            // Send initial count directly to this socket
            const activeIps = new Set();
            const sockets = io.sockets?.sockets;
            if (sockets) {
              for (const [_, s] of sockets) {
                let isReading = false;
                for (const room of s.rooms) {
                  if (room.startsWith("article:") || room === "public:site") {
                    isReading = true;
                    break;
                  }
                }
                if (isReading) {
                  const clientIp = s.handshake.headers["x-forwarded-for"] || s.handshake.address;
                  activeIps.add(clientIp);
                }
              }
            }
            socket.emit("analytics:traffic-update", { liveVisitors: activeIps.size });
          }
        } catch (_) {}
      }
    });

    socket.on("disconnect", () => {
      broadcastLiveTraffic(io);
    });
  });
};

