import mongoose from "mongoose";
import { createClient } from "redis";
import { v2 as cloudinary } from "cloudinary";
import webpush from "web-push";
import dotenv from "dotenv";

dotenv.config();

// 1. MongoDB Mongoose Connection
export const connectMongoDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.warn("⚠️ MONGO_URI is not set. Falling back to in-memory JSON file database mode.");
    return false;
  }
  try {
    await mongoose.connect(mongoUri);
    console.log("🚀 Connected to MongoDB successfully via Mongoose");
    return true;
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    console.warn("⚠️ Falling back to in-memory JSON file database mode.");
    return false;
  }
};

let redisClient = null;
let isRedisConnected = false;

// Simple high-fidelity in-memory Mock Sorted Set for Redis fallback
const localRedisStore = {};
const localSortedSets = {};

const mockRedis = {
  set: async (key, value) => {
    localRedisStore[key] = value;
    return "OK";
  },
  get: async (key) => {
    return localRedisStore[key] || null;
  },
  zIncrBy: async (key, increment, member) => {
    if (!localSortedSets[key]) {
      localSortedSets[key] = {};
    }
    const currentScore = localSortedSets[key][member] || 0;
    const newScore = currentScore + increment;
    localSortedSets[key][member] = newScore;
    return newScore;
  },
  zRevRangeWithScores: async (key, start, stop) => {
    const set = localSortedSets[key] || {};
    const entries = Object.entries(set)
      .map(([value, score]) => ({ value, score }))
      .sort((a, b) => b.score - a.score);
    return entries.slice(start, stop + 1);
  }
};

export const initRedis = async () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn("⚠️ REDIS_URL is not set. Falling back to in-memory Redis sorted set.");
    redisClient = mockRedis;
    return;
  }
  try {
    const client = createClient({ url: redisUrl });
    client.on("error", (err) => console.error("❌ Redis Client Error", err));
    await client.connect();
    console.log("🚀 Connected to Redis cache store successfully");
    redisClient = client;
    isRedisConnected = true;
  } catch (err) {
    console.error("❌ Redis connection failed:", err);
    console.warn("⚠️ Falling back to in-memory Redis sorted set.");
    redisClient = mockRedis;
  }
};

export const getRedisClient = () => {
  if (!redisClient) {
    return mockRedis;
  }
  return redisClient;
};

// 3. Cloudinary Image Upload Setup
const configureCloudinary = () => {
  const cloudinaryUrl = process.env.CLOUDINARY_URL;
  if (!cloudinaryUrl) {
    console.warn("⚠️ CLOUDINARY_URL is not set. Falling back to direct Base64 / Local memory storage.");
    return false;
  }
  try {
    // Cloudinary parses process.env.CLOUDINARY_URL automatically
    cloudinary.config();
    console.log("🚀 Cloudinary configured successfully for media optimization");
    return true;
  } catch (error) {
    console.error("❌ Cloudinary configuration failed:", error);
    return false;
  }
};

export const isCloudinaryActive = configureCloudinary();

// 4. Web Push Setup with automated default keys
export const initWebPush = () => {
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  let appUrl = process.env.APP_URL || "mailto:admin@pulsescream.app";

  if (appUrl === "MY_APP_URL" || (!appUrl.startsWith("http://") && !appUrl.startsWith("https://") && !appUrl.startsWith("mailto:"))) {
    appUrl = "mailto:admin@pulsescream.app";
  }

  if (!vapidPublic || !vapidPrivate) {
    console.warn("⚠️ VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are not set. Auto-generating transient VAPID keys for demo...");
    try {
      const generatedKeys = webpush.generateVAPIDKeys();
      webpush.setVapidDetails(
        appUrl,
        generatedKeys.publicKey,
        generatedKeys.privateKey
      );
      console.log("✨ Generated temporary VAPID keys for this session:", generatedKeys.publicKey);
      return {
        publicKey: generatedKeys.publicKey,
        privateKey: generatedKeys.privateKey,
        active: true
      };
    } catch (err) {
      console.error("❌ Web Push initialization failed:", err);
      return { publicKey: "", privateKey: "", active: false };
    }
  }

  try {
    webpush.setVapidDetails(appUrl, vapidPublic, vapidPrivate);
    console.log("🚀 Web Push VAPID keys set successfully");
    return { publicKey: vapidPublic, privateKey: vapidPrivate, active: true };
  } catch (error) {
    console.error("❌ Web Push VAPID configuration failed:", error);
    return { publicKey: "", privateKey: "", active: false };
  }
};

export const webPushConfig = initWebPush();
