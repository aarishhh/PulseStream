import { v2 as cloudinary } from "cloudinary";
import { isCloudinaryActive } from "../config/db.js";

export const uploadToCloudinary = async (fileBuffer, mimeType) => {
  if (!isCloudinaryActive) {
    console.warn("⚠️ Cloudinary not configured. Fallback to base64 Data URI.");
    const base64Str = fileBuffer.toString("base64");
    return `data:${mimeType};base64,${base64Str}`;
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "pulserate",
        resource_type: "image",
        transformation: [
          { width: 800, crop: "limit" }, // limit width to 800px max
          { quality: "auto:good" },      // auto compress quality
          { fetch_format: "auto" }      // auto webp format conversion
        ]
      },
      (error, result) => {
        if (error) {
          console.error("❌ Cloudinary upload error:", error);
          reject(error);
        } else {
          resolve(result?.secure_url || "");
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
};
