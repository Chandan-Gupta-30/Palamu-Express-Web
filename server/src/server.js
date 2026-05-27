import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { initializeSocket } from "./socket/index.js";

const bootstrap = async () => {
  await connectDb();

  const ioRef = { current: null };
  const app = createApp(ioRef);

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: env.clientUrls,
      methods: ["GET", "POST", "PATCH"],
    },
  });

  ioRef.current = io;

  initializeSocket(io);

  server.listen(env.port, () => {
    console.log(`Server listening on ${env.port}`);
  });
};

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
