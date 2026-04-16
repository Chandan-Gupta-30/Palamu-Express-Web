import cloudinary from "../config/cloudinary.js";
import { env } from "../config/env.js";

export const uploadBase64Asset = async (dataUri, folder) => {
  if (!dataUri) return null;
  if (typeof dataUri === "string" && !dataUri.startsWith("data:")) {
    return dataUri;
  }
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    return dataUri;
  }
  const result = await cloudinary.uploader.upload(dataUri, { folder, resource_type: "auto" });
  return result.secure_url;
};
