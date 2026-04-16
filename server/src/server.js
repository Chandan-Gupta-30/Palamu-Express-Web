import http from "http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import { initializeSocket } from "./socket/index.js";

const bootstrap = async () => {
  await connectDb();

  const server = http.createServer();
  const io = new Server(server, {
    cors: {
      origin: env.clientUrl,
      methods: ["GET", "POST", "PATCH"],
    },
  });

  initializeSocket(io);

  const app = createApp(io);
  server.removeAllListeners("request");
  server.on("request", app);

  server.listen(env.port, () => {
    console.log(`Server listening on ${env.port}`);
  });
};

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
