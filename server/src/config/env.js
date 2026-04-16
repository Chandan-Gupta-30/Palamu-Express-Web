import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const rootEnvPath = path.resolve(process.cwd(), ".env");
const serverEnvPath = path.resolve(process.cwd(), "server", ".env");
const resolvedEnvPath = fs.existsSync(serverEnvPath) ? serverEnvPath : rootEnvPath;

dotenv.config({ path: resolvedEnvPath });

export const env = {
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  mongoUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
  },
  geminiApiKey: process.env.GEMINI_API_KEY || "",
};
