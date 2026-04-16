import cloudinary from "../config/cloudinary.js";
import { env } from "../config/env.js";

const normalizeDataUri = (dataUri) => {
  const match = String(dataUri || "").match(/^data:([^;,]+)(;[^,]+)?,(.*)$/s);
  if (!match) return { dataUri: String(dataUri || ""), mimeType: "" };

  const [, mimeType = "", metadata = "", payload = ""] = match;
  const isBase64 = metadata.includes(";base64");
  const normalizedMetadata = isBase64 ? ";base64" : "";

  return {
    mimeType,
    dataUri: `data:${mimeType}${normalizedMetadata},${payload}`,
  };
};

const resolveResourceType = (mimeType) => {
  if (mimeType.startsWith("audio/") || mimeType.startsWith("video/")) {
    return "video";
  }

  if (mimeType.startsWith("image/")) {
    return "image";
  }

  return "raw";
};

export const uploadBase64Asset = async (dataUri, folder) => {
  if (!dataUri) return null;
  if (typeof dataUri === "string" && !dataUri.startsWith("data:")) {
    return dataUri;
  }
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    return dataUri;
  }

  const normalizedAsset = normalizeDataUri(dataUri);

  try {
    const result = await cloudinary.uploader.upload(normalizedAsset.dataUri, {
      folder,
      resource_type: resolveResourceType(normalizedAsset.mimeType),
    });
    return result.secure_url;
  } catch (error) {
    if (normalizedAsset.mimeType.startsWith("audio/")) {
      throw new Error("Voice recording upload failed. Please record again and try publishing once more.");
    }

    throw error;
  }
};
