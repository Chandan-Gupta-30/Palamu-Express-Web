import { verifyToken } from "../utils/jwt.js";

export const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    const authToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");

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
    });
  });
};
