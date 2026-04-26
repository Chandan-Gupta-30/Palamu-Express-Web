import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const candidateEnvPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "..", ".env"),
];
const resolvedEnvPath = candidateEnvPaths.find((candidatePath) => fs.existsSync(candidatePath));

if (resolvedEnvPath) {
  dotenv.config({ path: resolvedEnvPath });
}

const normalizeSecretValue = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("your_") ||
    trimmed.startsWith("replace_with_") ||
    trimmed.includes("_here")
  ) {
    return "";
  }
  return trimmed;
};

const splitConfiguredUrls = (value) =>
  String(value || "")
    .split(",")
    .map((entry) => normalizeSecretValue(entry))
    .filter(Boolean)
    .map((entry) => entry.replace(/\/+$/, ""));

const configuredClientUrls = splitConfiguredUrls(process.env.CLIENT_URLS);
const fallbackClientUrl = normalizeSecretValue(process.env.CLIENT_URL) || "http://localhost:5173";
const allowedClientUrls = configuredClientUrls.length
  ? configuredClientUrls
  : [fallbackClientUrl.replace(/\/+$/, "")];

export const env = {
  port: process.env.PORT || 5000,
  clientUrl: allowedClientUrls[0],
  clientUrls: allowedClientUrls,
  mongoUri: normalizeSecretValue(process.env.MONGODB_URI),
  jwtSecret: normalizeSecretValue(process.env.JWT_SECRET) || "change-me",
  jwtExpiresIn: normalizeSecretValue(process.env.JWT_EXPIRES_IN) || "7d",
  cloudinary: {
    cloudName: normalizeSecretValue(process.env.CLOUDINARY_CLOUD_NAME),
    apiKey: normalizeSecretValue(process.env.CLOUDINARY_API_KEY),
    apiSecret: normalizeSecretValue(process.env.CLOUDINARY_API_SECRET),
  },
  razorpay: {
    keyId: normalizeSecretValue(process.env.RAZORPAY_KEY_ID),
    keySecret: normalizeSecretValue(process.env.RAZORPAY_KEY_SECRET),
  },
  geminiApiKey: normalizeSecretValue(process.env.GEMINI_API_KEY),
};
