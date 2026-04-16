import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import articleRoutes from "./routes/articleRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import adRoutes from "./routes/adRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";

export const createApp = (io) => {
  const app = express();

  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(helmet());
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());
  app.use(morgan("dev"));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
    })
  );

  app.use((req, res, next) => {
    req.io = io;
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "palamu-express-api" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/articles", articleRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/ads", adRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/contact", contactRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
