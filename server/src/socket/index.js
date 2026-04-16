export const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("analytics:join", (slug) => {
      socket.join(`article:${slug}`);
      io.to(`article:${slug}`).emit("analytics:presence", { slug });
    });
  });
};

