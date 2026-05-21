import { bucket, isFirebaseInitialized } from "../config/firebase.js";
import crypto from "crypto";

const getExtension = (mimeType) => {
  const map = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "audio/webm": "webm",
    "audio/x-m4a": "m4a",
    "audio/m4a": "m4a",
  };
  return map[mimeType] || "bin";
};

export const uploadBase64Asset = async (dataUri, folder) => {
  if (!dataUri) return null;
  if (typeof dataUri === "string" && !dataUri.startsWith("data:")) {
    return dataUri;
  }

  // When operating in offline/mock mode, return the base64 URI directly so that 
  // the browser can immediately render and display the image or play the audio!
  if (!isFirebaseInitialized) {
    console.log(`[Upload Mock] Operating offline. Returning base64 Data URI directly for instant browser playback.`);
    return dataUri;
  }

  const match = String(dataUri || "").match(/^data:([^;,]+)(;[^,]+)?,(.*)$/s);
  if (!match) return dataUri;

  const mimeType = match[1];
  const payload = match[3];
  let buffer;
  try {
    buffer = Buffer.from(payload, "base64");
  } catch (err) {
    console.error("[Upload] Error decoding base64 payload:", err.message);
    return dataUri;
  }

  const ext = getExtension(mimeType);
  const filename = `${folder}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;

  try {
    const file = bucket.file(filename);
    const token = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
    
    // Save to bucket with custom metadata containing the Firebase Storage Download Token
    await file.save(buffer, {
      metadata: { 
        contentType: mimeType,
        metadata: {
          firebaseStorageDownloadTokens: token
        }
      },
    });

    // Make public so standard HTTP requests can retrieve it as a fallback
    try {
      if (typeof file.makePublic === "function") {
        await file.makePublic();
      }
    } catch (err) {
      console.warn("[Upload] Warning calling makePublic (safe to ignore if Uniform Access Control is enabled):", err.message);
    }

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media&token=${token}`;
    console.log(`[Upload] Asset successfully uploaded to Firebase Storage: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error("[Upload] Error uploading asset to Firebase Storage:", error.message);
    if (mimeType.startsWith("audio/")) {
      throw new Error("Voice recording upload failed. Please record again and try publishing once more.");
    }
    throw error;
  }
};
