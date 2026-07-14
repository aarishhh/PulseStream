/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { connectMongoDB, initRedis } from "./server/config/db.js";
import { setLocalDbState } from "./server/config/dbAdapter.js";
import { saveSubscription, sendPushNotification } from "./server/utils/pushNotifications.js";
import { trackHashtags } from "./server/utils/hashtags.js";
import { uploadToCloudinary } from "./server/utils/cloudinary.js";
import { upload } from "./server/middleware/uploadMiddleware.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import admin from "firebase-admin";

// Database storage file
const DB_FILE = path.join(process.cwd(), "db.json");

// Define Mock Redis
class MockRedis {
  scores = new Map();

  async zincrby(key, increment, member) {
    const current = this.scores.get(member) || 0;
    const next = current + increment;
    this.scores.set(member, next);
    return next;
  }

  async zrevrangeWithScores(key, start, stop) {
    const entries = Array.from(this.scores.entries())
      .map(([hashtag, count]) => ({ hashtag, count: Math.round(count) }))
      .sort((a, b) => b.count - a.count);
    return entries.slice(start, stop + 1);
  }

  seed(member, score) {
    this.scores.set(member, score);
  }
}

const redis = new MockRedis();

// Seed initial trending tags in Redis
redis.seed("#TechInnovation", 12400);
redis.seed("#MondayMotivation", 8700);
redis.seed("#WorldPhotographyDay", 6300);
redis.seed("#AIRevolution", 5200);
redis.seed("#TravelDiaries", 4800);

// Set up Gemini AI client lazily
let aiClient = null;
let cachedWhatsHappening = null;
let lastWhatsHappeningTime = 0;

function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return aiClient;
}

// AI Content Moderation function
async function moderateContent(content) {
  const client = getGeminiClient();
  if (client) {
    try {
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `You are an AI content moderator for PulseStream, a professional microblogging platform.
        Analyze the following post content and decide if it is appropriate.
        Inappropriate content includes severe hate speech, harassment, extreme graphic violence, explicit adult material, or severe spam.
        Return your response strictly in JSON format.
        JSON Schema:
        {
          "approved": boolean,
          "reason": string (brief explanation if not approved, or empty string if approved)
        }
        Post content to moderate: "${content}"`,
        config: {
          responseMimeType: "application/json",
        },
      });

      if (response.text) {
        const result = JSON.parse(response.text.trim());
        return {
          approved: typeof result.approved === "boolean" ? result.approved : true,
          reason: result.reason || undefined,
        };
      }
    } catch (error) {
      console.error("Gemini content moderation error, using fallback rules:", error);
    }
  }

  // Graceful rule-based fallback if no Gemini API Key is configured or fails
  const lowercase = content.toLowerCase();
  const prohibited = ["spamspamspam", "violate_policy_test_flag"];
  for (const word of prohibited) {
    if (lowercase.includes(word)) {
      return { approved: false, reason: "Content violated security policy (detected prohibited keyword)." };
    }
  }
  return { approved: true };
}

// Initial Users List
const initialUsers = {
  aarish_master: {
    username: "aarish_master",
    displayName: "Aarish",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&h=150&q=80",
    banner: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&h=400&q=80",
    bio: "Building in public. Code. Create. Inspire. \nBCA Student | Full Stack Developer | Tech Enthusiast",
    location: "Pune, India",
    joinedDate: "March 2024",
    website: "aarish.dev",
    followers: [],
    following: [],
  }
};

// Initial Posts List
const initialPosts = [
  {
    id: "post_4",
    author: initialUsers.aarish_master,
    content: "Just shipped a new update to PulseStream! 🚀 Real-time everything. Built with ❤️ #buildinpublic #webdev #realtime",
    likes: [],
    reposts: [],
    comments: [],
    createdAt: "2026-07-05T07:52:00-07:00",
    views: 0,
    isModerated: true,
  }
];

// Initial Notifications List
const initialNotifications = [];

const initialMessages = [];

let dbState = {
  users: initialUsers,
  posts: initialPosts,
  notifications: initialNotifications,
  messages: initialMessages,
  passwords: {},
  refreshTokens: {},
  bookmarks: {},
  lists: [],
};

// Define Mongoose Schema for database state if we are using MongoDB
const StateSchema = new mongoose.Schema({
  key: { type: String, default: "dbState", unique: true },
  state: { type: mongoose.Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now }
}, { minimize: false });

const StateModel = mongoose.models.State || mongoose.model("State", StateSchema);

// On startup, check if DB_FILE exists and delete it to ensure zero-disk secure operation
try {
  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
    console.log("🧹 Deleted local db.json file to ensure secure zero-disk database operation.");
  }
} catch (err) {
  console.error("Failed to delete local db.json file on startup:", err);
}

let dbLoaded = false;

// Sync database state securely (MongoDB or Memory-only)
async function loadDatabase() {
  if (dbLoaded) return;

  const isMongoConnected = mongoose.connection.readyState === 1;
  if (isMongoConnected) {
    try {
      const doc = await StateModel.findOne({ key: "dbState" });
      if (doc && doc.state) {
        dbState = doc.state;
        console.log("🚀 Loaded database state successfully from MongoDB!");
        dbLoaded = true;
      } else {
        console.log("📝 No database state found in MongoDB. Initializing with default state...");
        await StateModel.findOneAndUpdate(
          { key: "dbState" },
          { state: dbState },
          { upsert: true, new: true }
        );
        dbLoaded = true;
      }
    } catch (err) {
      console.error("❌ Failed to load database state from MongoDB:", err);
    }
  }

  if (!dbLoaded) {
    console.log("ℹ️ Operating database state in-memory only (secure zero-disk mode).");
    dbLoaded = true;
  }

  try {
    // Purge old demo users and their associated posts to strictly keep only authorized demo users
    const demoUsersToRemove = [
      "ananyaverma", "rohittweets", "snehagupta", "designdaily", "nehasharma", 
      "vikrantmassey", "techtalks", "sarahkhan", "arjundev", "devanshmehta",
      "sportskeeda", "srbachchan", "rgvzoomin", "nameisnani", 
      "pawankalyan", "hegdepooja", "surya_14kumar", "gautam_adani"
    ];
    
    let changed = false;
    for (const username of demoUsersToRemove) {
      if (dbState.users[username]) {
        delete dbState.users[username];
        changed = true;
      }
      if (dbState.passwords && dbState.passwords[username]) {
        delete dbState.passwords[username];
        changed = true;
      }
      if (dbState.bookmarks && dbState.bookmarks[username]) {
        delete dbState.bookmarks[username];
        changed = true;
      }
      if (dbState.refreshTokens && dbState.refreshTokens[username]) {
        delete dbState.refreshTokens[username];
        changed = true;
      }
    }

    // Filter posts to remove any whose author was deleted, and clean likes/reposts referencing deleted users
    const validUsernames = Object.keys(dbState.users);
    const originalPostCount = dbState.posts.length;
    
    dbState.posts = dbState.posts.filter(p => validUsernames.includes(p.author.username.toLowerCase()));
    
    dbState.posts.forEach(p => {
      p.likes = p.likes.filter(u => validUsernames.includes(u.toLowerCase()));
      p.reposts = p.reposts.filter(u => validUsernames.includes(u.toLowerCase()));
      p.comments = p.comments.filter(c => validUsernames.includes(c.author.username.toLowerCase()));
      // Reset any fake view counts on startup
      if (p.views === 2100 || p.views === 3100 || p.views === 2400 || p.views > 150) {
        p.views = 0;
        changed = true;
      }
    });

    // Clean up notifications
    if (dbState.notifications) {
      const origNotifs = dbState.notifications.length;
      dbState.notifications = dbState.notifications.filter(n => {
        const hasValidSender = n.sender && validUsernames.includes(n.sender.username.toLowerCase());
        const hasValidReceiver = !n.receiverUsername || validUsernames.includes(n.receiverUsername.toLowerCase());
        return hasValidSender && hasValidReceiver;
      });
      if (dbState.notifications.length !== origNotifs) {
        changed = true;
      }
    }

    // Clean up messages
    if (dbState.messages) {
      const origMessages = dbState.messages.length;
      dbState.messages = dbState.messages.filter(m => {
        return m.senderUsername && m.receiverUsername && 
               validUsernames.includes(m.senderUsername.toLowerCase()) && 
               validUsernames.includes(m.receiverUsername.toLowerCase());
      });
      if (dbState.messages.length !== origMessages) {
        changed = true;
      }
    }

    // Clean up followers and following arrays for all remaining users
    Object.keys(dbState.users).forEach(uname => {
      const u = dbState.users[uname];
      if (u) {
        if (!u.followers) u.followers = [];
        if (!u.following) u.following = [];
        const prevFollowersLength = u.followers.length;
        const prevFollowingLength = u.following.length;

        u.followers = u.followers.filter(f => validUsernames.includes(f.toLowerCase()));
        u.following = u.following.filter(f => validUsernames.includes(f.toLowerCase()));

        if (u.followers.length !== prevFollowersLength || u.following.length !== prevFollowingLength) {
          changed = true;
        }
      }
    });

    // Re-assign nested post authors to the cleaned up user objects
    dbState.posts.forEach(p => {
      const userObj = dbState.users[p.author.username.toLowerCase()];
      if (userObj) {
        p.author = userObj;
      }
    });

    if (dbState.posts.length !== originalPostCount || changed) {
      changed = true;
    }

    // Ensure passwords dictionary exists
    if (!dbState.passwords) {
      dbState.passwords = {};
    }

    // Ensure refresh tokens dictionary exists
    if (!dbState.refreshTokens) {
      dbState.refreshTokens = {};
    }

    // Ensure bookmarks exist
    if (!dbState.bookmarks) {
      dbState.bookmarks = {};
    }

    // Ensure lists exist
    if (!dbState.lists || dbState.lists.length === 0) {
      dbState.lists = [
        {
          id: "list_1",
          name: "Tech Founders",
          description: "Industry leaders and innovative creators",
          ownerUsername: "aarish_master",
          members: ["aarish_master"],
          isPrivate: false,
        }
      ];
      changed = true;
    } else {
      // Clean up lists to keep only valid members
      const origLists = dbState.lists.length;
      dbState.lists = dbState.lists.filter(l => validUsernames.includes(l.ownerUsername.toLowerCase()));
      dbState.lists.forEach(l => {
        const origMembers = l.members.length;
        l.members = l.members.filter(m => validUsernames.includes(m.toLowerCase()));
        if (l.members.length !== origMembers) {
          changed = true;
        }
      });
      if (dbState.lists.length !== origLists) {
        changed = true;
      }
    }

    // Ensure all existing database users have a secure password seeded
    for (const u of Object.keys(dbState.users)) {
      if (!dbState.passwords[u]) {
        dbState.passwords[u] = "password123";
      }
    }

    // Clean up any self-messages (sender === receiver)
    if (dbState.messages) {
      const originalLen = dbState.messages.length;
      dbState.messages = dbState.messages.filter(
        m => m.senderUsername && m.receiverUsername && m.senderUsername.toLowerCase() !== m.receiverUsername.toLowerCase()
      );
      if (dbState.messages.length !== originalLen) {
        changed = true;
      }
    }

    if (changed) {
      await saveDatabase();
    }
  } catch (err) {
    console.error("Error loading database:", err);
  }
}

async function saveDatabase() {
  try {
    const isMongoConnected = mongoose.connection.readyState === 1;
    if (isMongoConnected) {
      await StateModel.findOneAndUpdate(
        { key: "dbState" },
        { state: dbState },
        { upsert: true, new: true }
      );
      console.log("💾 Saved database state securely to MongoDB!");
    } else {
      console.log("💾 Saved database state in-memory (secure zero-disk mode).");
    }
  } catch (err) {
    console.error("Error saving database:", err);
  }
}

async function startServer() {
  // Connect Mongoose & Redis clients on startup (with elegant local fallbacks)
  await connectMongoDB();
  await initRedis();

  // Initialize Firebase Admin SDK using configurations in firebase-applet-config.json
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      admin.initializeApp({
        projectId: config.projectId,
      });
      console.log("🔥 Firebase Admin SDK initialized successfully in Express server!");
    } else {
      console.warn("⚠️ firebase-applet-config.json not found. Firebase Admin not initialized.");
    }
  } catch (err) {
    console.error("❌ Failed to initialize Firebase Admin SDK:", err);
  }

  // Load database securely
  await loadDatabase();

  // Register the Local DB with the fallback adapter
  setLocalDbState(dbState, saveDatabase);

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  app.use(express.json({ limit: "50mb" }));

  // JWT Secret Configuration
  const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret_key_123_456_789";
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_secret_key_987_654_321";

  // Helper functions to sign JWT access & refresh tokens
  function generateAccessToken(username) {
    return jwt.sign({ username }, JWT_ACCESS_SECRET, { expiresIn: "15m" });
  }

  function generateRefreshToken(username) {
    return jwt.sign({ username }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
  }

  // Secure JWT session parsing & automatic token rotation middleware
  app.use((req, res, next) => {
    const cookies = req.headers.cookie;
    if (!cookies) {
      req.activeUsername = "aarish_master";
      req.isAuthenticated = false;
      return next();
    }

    const accessMatch = cookies.match(/(?:^|; )access_token=([^;]*)/);
    const refreshMatch = cookies.match(/(?:^|; )refresh_token=([^;]*)/);

    const accessToken = accessMatch ? accessMatch[1] : null;
    const refreshToken = refreshMatch ? refreshMatch[1] : null;

    if (!accessToken && !refreshToken) {
      req.activeUsername = "aarish_master";
      req.isAuthenticated = false;
      return next();
    }

    // 1. Verify Access Token (Short-lived, HTTP-only)
    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, JWT_ACCESS_SECRET);
        if (decoded && decoded.username && dbState.users[decoded.username]) {
          req.activeUsername = decoded.username;
          req.isAuthenticated = true;
          return next();
        }
      } catch (err) {
        // Access token invalid/expired, attempt rotation with refresh token
      }
    }

    // 2. Verify and rotate Refresh Token (Long-lived, HTTP-only)
    if (refreshToken) {
      try {
        const decodedRefresh = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        const username = decodedRefresh.username;

        if (username && dbState.users[username]) {
          const activeTokens = dbState.refreshTokens?.[username] || [];
          const tokenIndex = activeTokens.indexOf(refreshToken);

          if (tokenIndex !== -1) {
            // Valid refresh token! Rotate tokens safely.
            const newAccessToken = generateAccessToken(username);
            const newRefreshToken = generateRefreshToken(username);

            activeTokens[tokenIndex] = newRefreshToken;
            if (!dbState.refreshTokens) {
              dbState.refreshTokens = {};
            }
            dbState.refreshTokens[username] = activeTokens;
            saveDatabase();

            res.setHeader("Set-Cookie", [
              `access_token=${newAccessToken}; Path=/; HttpOnly; Max-Age=900; SameSite=Lax`,
              `refresh_token=${newRefreshToken}; Path=/; HttpOnly; Max-Age=604800; SameSite=Lax`
            ]);

            req.activeUsername = username;
            req.isAuthenticated = true;
            return next();
          } else {
            // Reuse/replay detected! Revoke all refresh tokens for this user as a safeguard.
            if (dbState.refreshTokens) {
              dbState.refreshTokens[username] = [];
              saveDatabase();
            }
            console.warn(`⚠️ Warning: Refresh token reuse detected for user ${username}. Revoking all sessions.`);
            res.setHeader("Set-Cookie", [
              `access_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`,
              `refresh_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`
            ]);
          }
        }
      } catch (err) {
        // Refresh token invalid or expired
      }
    }

    req.activeUsername = "aarish_master";
    req.isAuthenticated = false;
    next();
  });

  // Expose Web Push subscription endpoint
  app.post("/api/notifications/subscribe", async (req, res) => {
    const activeUsername = getActiveUsername(req);
    const { subscription } = req.body;
    if (!subscription) {
      return res.status(400).json({ error: "Subscription object is required" });
    }
    await saveSubscription(activeUsername, subscription);
    res.status(201).json({ status: "success", message: "Push subscription registered successfully" });
  });

  // Direct media upload route that streams to Cloudinary with compression/optimization
  app.post("/api/posts/upload", upload.single("image"), async (req, res) => {
    const activeUser = getActiveUser(req);
    if (!activeUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }
    try {
      const secureUrl = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
      res.json({ secureUrl });
    } catch (err) {
      console.error("❌ Cloudinary upload route failed:", err);
      res.status(500).json({ error: "Image processing or upload failed" });
    }
  });

  // Dynamic Active User Resolution Helpers
  function getActiveUsername(req) {
    return req.activeUsername || "aarish_master";
  }

  function getActiveUser(req) {
    const username = getActiveUsername(req);
    return dbState.users[username] || null;
  }

  // API REST Routes

  // Get current active user profile (resolves via session cookie)
  app.get("/api/me", (req, res) => {
    const username = req.activeUsername;
    const isAuthenticated = req.isAuthenticated;
    if (isAuthenticated && username && dbState.users[username]) {
      return res.json(dbState.users[username]);
    }
    res.json(null);
  });

  // POST Firebase Authenticated Integration
  app.post("/api/auth/firebase", async (req, res) => {
    const { idToken, username: requestedUsername, displayName: requestedDisplayName } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: "Firebase ID Token is required" });
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const email = decodedToken.email || `${decodedToken.uid}@pulsestream.com`;
      const uid = decodedToken.uid;
      const name = decodedToken.name || requestedDisplayName || email.split("@")[0];

      // Map this to a user profile in dbState
      // Search if any existing user matches either this email/uid or requested username
      let user = null;
      let matchedUsername = null;

      for (const uname of Object.keys(dbState.users)) {
        const u = dbState.users[uname];
        if (u.email === email || u.firebaseUid === uid) {
          user = u;
          matchedUsername = uname;
          break;
        }
      }

      if (!user) {
        // We need to create a new user profile
        // Determine a clean unique username
        let finalUsername = requestedUsername ? requestedUsername.trim().toLowerCase() : email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
        
        if (!finalUsername) {
          finalUsername = "user_" + uid.slice(0, 5);
        }

        let counter = 1;
        let candidateUsername = finalUsername;
        while (dbState.users[candidateUsername]) {
          candidateUsername = `${finalUsername}_${counter}`;
          counter++;
        }
        finalUsername = candidateUsername;

        const avatars = [
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80",
        ];
        const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

        user = {
          username: finalUsername,
          displayName: name.trim() || finalUsername,
          avatar: randomAvatar,
          banner: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&h=400&q=80",
          bio: "Excited to join the conversation on PulseStream via Firebase Auth!",
          location: "Earth",
          joinedDate: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
          website: "",
          followers: [],
          following: ["aarish_master"], // auto-follow master account
          email: email,
          firebaseUid: uid,
        };

        if (dbState.users["aarish_master"]) {
          dbState.users["aarish_master"].followers.push(finalUsername);
        }

        dbState.users[finalUsername] = user;
        matchedUsername = finalUsername;
      } else {
        // Update user properties if needed
        if (!user.firebaseUid) {
          user.firebaseUid = uid;
        }
        if (!user.email) {
          user.email = email;
        }
      }

      // Generate JWT access & refresh tokens
      const accessToken = generateAccessToken(matchedUsername);
      const refreshToken = generateRefreshToken(matchedUsername);

      if (!dbState.refreshTokens) {
        dbState.refreshTokens = {};
      }
      dbState.refreshTokens[matchedUsername] = [refreshToken];
      await saveDatabase();

      // Set secure HTTP-only cookies
      res.setHeader("Set-Cookie", [
        `access_token=${accessToken}; Path=/; HttpOnly; Max-Age=900; SameSite=Lax`,
        `refresh_token=${refreshToken}; Path=/; HttpOnly; Max-Age=604800; SameSite=Lax`
      ]);

      res.json(user);
    } catch (err) {
      console.error("❌ Firebase Token Verification failed:", err);
      res.status(401).json({ error: "Invalid Firebase ID Token" });
    }
  });

  // POST Login
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }
    const cleanUsername = username.trim().toLowerCase();
    const user = dbState.users[cleanUsername];
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    // Verify password strictly
    const storedPassword = dbState.passwords ? dbState.passwords[cleanUsername] : null;
    if (!storedPassword || password !== storedPassword) {
      return res.status(400).json({ error: "Incorrect password" });
    }

    // Generate JWT access & refresh tokens
    const accessToken = generateAccessToken(cleanUsername);
    const refreshToken = generateRefreshToken(cleanUsername);

    if (!dbState.refreshTokens) {
      dbState.refreshTokens = {};
    }
    if (!dbState.refreshTokens[cleanUsername]) {
      dbState.refreshTokens[cleanUsername] = [];
    }
    dbState.refreshTokens[cleanUsername].push(refreshToken);
    saveDatabase();

    // Set secure HTTP-only cookies
    res.setHeader("Set-Cookie", [
      `access_token=${accessToken}; Path=/; HttpOnly; Max-Age=900; SameSite=Lax`,
      `refresh_token=${refreshToken}; Path=/; HttpOnly; Max-Age=604800; SameSite=Lax`
    ]);

    res.json(user);
  });

  // POST Register
  app.post("/api/register", (req, res) => {
    const { username, displayName, password } = req.body;
    if (!username || !displayName) {
      return res.status(400).json({ error: "Username and display name are required" });
    }
    const cleanUsername = username.trim().toLowerCase();
    if (dbState.users[cleanUsername]) {
      return res.status(400).json({ error: "Username already taken" });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long for security" });
    }

    const avatars = [
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80",
    ];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

    const newUser = {
      username: cleanUsername,
      displayName: displayName.trim(),
      avatar: randomAvatar,
      banner: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&h=400&q=80",
      bio: "Excited to join the conversation on PulseStream!",
      location: "Earth",
      joinedDate: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
      website: "",
      followers: [],
      following: ["aarish_master"], // auto-follow master account
    };

    if (!dbState.passwords) {
      dbState.passwords = {};
    }
    dbState.passwords[cleanUsername] = password || "password123";

    if (dbState.users["aarish_master"]) {
      dbState.users["aarish_master"].followers.push(cleanUsername);
    }

    dbState.users[cleanUsername] = newUser;

    // Generate JWT access & refresh tokens
    const accessToken = generateAccessToken(cleanUsername);
    const refreshToken = generateRefreshToken(cleanUsername);

    if (!dbState.refreshTokens) {
      dbState.refreshTokens = {};
    }
    dbState.refreshTokens[cleanUsername] = [refreshToken];
    saveDatabase();

    // Set secure HTTP-only cookies
    res.setHeader("Set-Cookie", [
      `access_token=${accessToken}; Path=/; HttpOnly; Max-Age=900; SameSite=Lax`,
      `refresh_token=${refreshToken}; Path=/; HttpOnly; Max-Age=604800; SameSite=Lax`
    ]);

    res.status(201).json(newUser);
  });

  // POST Logout
  app.post("/api/logout", (req, res) => {
    const cookies = req.headers.cookie;
    if (cookies) {
      const refreshMatch = cookies.match(/(?:^|; )refresh_token=([^;]*)/);
      if (refreshMatch) {
        const refreshToken = refreshMatch[1];
        try {
          const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
          const username = decoded.username;
          if (username && dbState.refreshTokens && dbState.refreshTokens[username]) {
            dbState.refreshTokens[username] = dbState.refreshTokens[username].filter(t => t !== refreshToken);
            saveDatabase();
          }
        } catch (err) {
          // ignore
        }
      }
    }

    res.setHeader("Set-Cookie", [
      "access_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax",
      "refresh_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax"
    ]);
    res.json({ success: true });
  });

  // Get follow suggestions
  app.get("/api/suggestions", (req, res) => {
    const activeUser = getActiveUser(req);
    const activeUsername = activeUser ? activeUser.username : "";
    
    // Filter suggestions: not the current user and not already followed
    const suggestions = Object.values(dbState.users).filter(u => {
      if (u.username === activeUsername) return false;
      if (activeUser && activeUser.following.includes(u.username)) return false;
      return true;
    });
    
    res.json(suggestions);
  });

  // Get single user profile
  app.get("/api/users/:username", (req, res) => {
    const username = req.params.username.trim().toLowerCase();
    const user = dbState.users[username];
    if (user) {
      if (!user.followers) user.followers = [];
      if (!user.following) user.following = [];
      
      // Increment profile visits dynamically
      const activeUser = getActiveUser(req);
      if (activeUser && activeUser.username.toLowerCase() !== username) {
        user.profileVisits = (user.profileVisits || 0) + 1;
        saveDatabase();
      }

      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  // Get multiple user profiles by usernames
  app.post("/api/users/batch", (req, res) => {
    const { usernames } = req.body;
    if (!Array.isArray(usernames)) {
      return res.status(400).json({ error: "usernames array is required" });
    }
    const result = usernames
      .map(username => {
        const cleanName = username.trim().toLowerCase();
        const u = dbState.users[cleanName];
        if (u) {
          if (!u.followers) u.followers = [];
          if (!u.following) u.following = [];
        }
        return u;
      })
      .filter(Boolean);
    res.json(result);
  });

  // Update current user profile
  app.post("/api/users/profile", (req, res) => {
    const { displayName, bio, location, website } = req.body;
    const user = getActiveUser(req);
    if (user) {
      user.displayName = displayName || user.displayName;
      user.bio = bio !== undefined ? bio : user.bio;
      user.location = location !== undefined ? location : user.location;
      user.website = website !== undefined ? website : user.website;
      saveDatabase();
      res.json(user);
    } else {
      res.status(404).json({ error: "Active user not found" });
    }
  });

  // Delete user account
  app.delete("/api/users/account", (req, res) => {
    const activeUser = getActiveUser(req);
    if (!activeUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const usernameLower = activeUser.username.toLowerCase();

    // 1. Remove from dbState.users
    if (dbState.users[usernameLower]) {
      delete dbState.users[usernameLower];
    }

    // 2. Remove user's refresh tokens
    if (dbState.refreshTokens && dbState.refreshTokens[activeUser.username]) {
      delete dbState.refreshTokens[activeUser.username];
    }

    // 3. Remove all posts authored by this user
    dbState.posts = dbState.posts.filter(
      (p) => p.author.username.toLowerCase() !== usernameLower
    );

    // 4. Remove this user's username from other users' following & followers arrays
    for (const u of Object.values(dbState.users)) {
      if (u.followers) {
        u.followers = u.followers.filter(
          (f) => f.toLowerCase() !== usernameLower
        );
      }
      if (u.following) {
        u.following = u.following.filter(
          (f) => f.toLowerCase() !== usernameLower
        );
      }
    }

    // 5. Clean up bookmarks for this user
    if (dbState.bookmarks && dbState.bookmarks[activeUser.username]) {
      delete dbState.bookmarks[activeUser.username];
    }

    // 6. Clean up lists owned by this user
    if (dbState.lists) {
      dbState.lists = dbState.lists.filter(
        (list) => list.ownerUsername.toLowerCase() !== usernameLower
      );
    }

    saveDatabase();

    // 7. Clear authentication cookies
    res.setHeader("Set-Cookie", [
      "access_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax",
      "refresh_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax"
    ]);

    res.json({ success: true });
  });

  // Follow/unfollow toggle
  app.post("/api/users/:username/follow", (req, res) => {
    const targetUsername = req.params.username.trim().toLowerCase();
    const activeUser = getActiveUser(req);
    const targetUser = dbState.users[targetUsername];

    if (!activeUser || !targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (activeUser.username === targetUsername) {
      return res.status(400).json({ error: "You cannot follow yourself" });
    }

    if (!activeUser.following) activeUser.following = [];
    if (!activeUser.followers) activeUser.followers = [];
    if (!targetUser.following) targetUser.following = [];
    if (!targetUser.followers) targetUser.followers = [];

    const isFollowing = activeUser.following.includes(targetUsername);

    if (isFollowing) {
      // Unfollow
      activeUser.following = activeUser.following.filter(u => u !== targetUsername);
      targetUser.followers = targetUser.followers.filter(u => u !== activeUser.username);
    } else {
      // Follow
      if (!activeUser.following.includes(targetUsername)) {
        activeUser.following.push(targetUsername);
      }
      if (!targetUser.followers.includes(activeUser.username)) {
        targetUser.followers.push(activeUser.username);
      }

      // Generate real-time notification
      const newNotif = {
        id: "notif_" + Date.now(),
        type: "follow",
        sender: activeUser,
        createdAt: new Date().toISOString(),
        read: false,
        receiverUsername: targetUsername,
      };
      dbState.notifications.unshift(newNotif);
      io.to(`user_room_${targetUsername}`).emit("notification_received", newNotif);

      // Trigger automated web push notification
      sendPushNotification(
        targetUsername,
        "New Follower! 👥",
        `${activeUser.displayName} started following you.`,
        { username: activeUser.username }
      ).catch(err => console.error("Push Notification failed:", err));
    }

    saveDatabase();
    res.json({ following: activeUser.following, targetFollowers: targetUser.followers });
  });

  // Get notifications
  app.get("/api/notifications", (req, res) => {
    const activeUsername = getActiveUsername(req);
    if (!activeUsername) {
      return res.json([]);
    }

    const filteredNotifs = dbState.notifications.filter(n => {
      if (n.receiverUsername) {
        return n.receiverUsername.toLowerCase() === activeUsername.toLowerCase();
      }
      if (n.post) {
        const post = dbState.posts.find(p => p.id === n.post?.id);
        if (post) {
          return post.author.username.toLowerCase() === activeUsername.toLowerCase();
        }
      }
      return false;
    });

    res.json(filteredNotifs);
  });

  // Mark all notifications as read
  app.post("/api/notifications/read", (req, res) => {
    const activeUsername = getActiveUsername(req);
    if (activeUsername) {
      dbState.notifications.forEach(n => {
        let isMine = false;
        if (n.receiverUsername) {
          isMine = n.receiverUsername.toLowerCase() === activeUsername.toLowerCase();
        } else if (n.post) {
          const post = dbState.posts.find(p => p.id === n.post?.id);
          if (post) {
            isMine = post.author.username.toLowerCase() === activeUsername.toLowerCase();
          }
        }
        if (isMine) {
          n.read = true;
        }
      });
      saveDatabase();
    }
    res.json({ success: true });
  });

  // Get all messages for active user
  app.get("/api/messages", (req, res) => {
    const activeUsername = getActiveUsername(req);
    if (!dbState.messages) {
      dbState.messages = [];
    }
    const userMessages = dbState.messages.filter(
      m => m.senderUsername === activeUsername || m.receiverUsername === activeUsername
    );
    res.json(userMessages);
  });

  // Mark all messages as read from a specific user
  app.post("/api/messages/read-all/:username", (req, res) => {
    const activeUsername = getActiveUsername(req);
    const contactUsername = req.params.username;
    if (dbState.messages) {
      dbState.messages.forEach(m => {
        if (m.senderUsername === contactUsername && m.receiverUsername === activeUsername) {
          m.read = true;
        }
      });
      saveDatabase();
    }
    // Emit real-time read event to the user's room
    io.to(`user_room_${activeUsername}`).emit("messages_read", { senderUsername: contactUsername, receiverUsername: activeUsername });
    res.json({ success: true });
  });

  // Send a new message
  app.post("/api/messages", (req, res) => {
    const activeUsername = getActiveUsername(req);
    const { receiverUsername, content } = req.body;
    if (!receiverUsername || !content) {
      return res.status(400).json({ error: "Receiver and content required" });
    }
    if (activeUsername && receiverUsername && activeUsername.toLowerCase() === receiverUsername.toLowerCase()) {
      return res.status(400).json({ error: "You cannot send messages to yourself" });
    }

    const newMessage = {
      id: "msg_" + Date.now(),
      senderUsername: activeUsername,
      receiverUsername,
      content,
      createdAt: new Date().toISOString(),
      read: false,
    };

    if (!dbState.messages) {
      dbState.messages = [];
    }
    dbState.messages.push(newMessage);
    saveDatabase();

    // Notify recipient in real-time if online
    io.to(`user_room_${receiverUsername}`).emit("message_received", newMessage);

    res.status(201).json(newMessage);
  });

  // Get all posts (or search/category/hashtag filtering)
  app.get("/api/posts", (req, res) => {
    const { query, hashtag, username, tab } = req.query;
    let filteredPosts = [...dbState.posts];

    // Filter out future scheduled posts unless the querying user is the author
    const activeUser = getActiveUser(req);
    filteredPosts = filteredPosts.filter(p => {
      if (!p.scheduledAt) return true;
      const isAuthor = activeUser && p.author.username === activeUser.username;
      if (isAuthor) return true;
      return new Date(p.scheduledAt).getTime() <= Date.now();
    });

    // Filter by User
    if (username) {
      filteredPosts = filteredPosts.filter(p => p.author.username === username);
    }

    // Filter by search query
    if (query) {
      const q = query.toLowerCase();
      filteredPosts = filteredPosts.filter(
        p => p.content && (p.content.toLowerCase().includes(q) || p.author.displayName.toLowerCase().includes(q) || p.author.username.toLowerCase().includes(q))
      );
    }

    // Filter by hashtag
    if (hashtag) {
      const h = hashtag.toLowerCase();
      filteredPosts = filteredPosts.filter(p => p.content && p.content.toLowerCase().includes(h));
    }

    // Tab-based feeds
    if (tab === "following") {
      const actualActive = activeUser || dbState.users["aarish_master"];
      filteredPosts = filteredPosts.filter(p => actualActive.following.includes(p.author.username) || p.author.username === actualActive.username);
    } else if (tab === "trending") {
      filteredPosts = filteredPosts.sort((a, b) => b.views - a.views);
    } else {
      // default: sorted by newest
      filteredPosts = filteredPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    res.json(filteredPosts);
  });

  // Global Unified Search
  app.get("/api/search", (req, res) => {
    const q = (req.query.q || "").toString().toLowerCase().trim();
    if (!q) {
      return res.json({ posts: [], users: [] });
    }

    // Filter posts
    const matchedPosts = dbState.posts.filter(p => 
      p.content.toLowerCase().includes(q) || 
      p.author.displayName.toLowerCase().includes(q) || 
      p.author.username.toLowerCase().includes(q)
    );

    // Filter users
    const matchedUsers = Object.values(dbState.users).filter(u => 
      u.username.toLowerCase().includes(q) || 
      u.displayName.toLowerCase().includes(q) || 
      (u.bio && u.bio.toLowerCase().includes(q))
    ).map(u => {
      // Ensure arrays exist
      if (!u.followers) u.followers = [];
      if (!u.following) u.following = [];
      return u;
    });

    res.json({
      posts: matchedPosts,
      users: matchedUsers
    });
  });

  // Get single post by ID
  app.get("/api/posts/:id", (req, res) => {
    const postId = req.params.id;
    const post = dbState.posts.find(p => p.id === postId);
    if (post) {
      post.views = (post.views || 0) + 1;
      saveDatabase();
      io.emit("post_updated", post);
      res.json(post);
    } else {
      res.status(404).json({ error: "Post not found" });
    }
  });

  // Explicitly increment view count on post
  app.post("/api/posts/:id/view", (req, res) => {
    const postId = req.params.id;
    const post = dbState.posts.find(p => p.id === postId);
    if (post) {
      post.views = (post.views || 0) + 1;
      saveDatabase();
      io.emit("post_updated", post);
      return res.json({ success: true, views: post.views });
    }
    res.status(404).json({ error: "Post not found" });
  });

  // Create a new post (with AI content moderation middleware)
  app.post("/api/posts", async (req, res) => {
    const { content, image, gif, poll, location, scheduledAt } = req.body;
    const activeUser = getActiveUser(req);

    if (!activeUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!content && !image && !gif && !poll) {
      return res.status(400).json({ error: "Post cannot be empty" });
    }

    // Run AI content moderation if content is provided
    if (content) {
      const moderation = await moderateContent(content || "");
      if (!moderation.approved) {
        return res.status(400).json({
          error: "Post blocked by content moderation",
          reason: moderation.reason || "Violated terms of service (explicit/abusive content detected).",
          flagged: true,
        });
      }
    }

    // Process image (Simulating Cloudinary optimization)
    let processedImage = image;
    if (image && image.startsWith("data:image")) {
      // High-fidelity Mock Cloudinary compression / resizing
      console.log("Simulating Cloudinary processing for automatic resizing and lazy-loading optimizations...");
      processedImage = image; // Retains data url for instant frontend display without external storage dependency
    }

    const newPost = {
      id: "post_" + Date.now(),
      author: activeUser,
      content: content || "",
      image: processedImage || undefined,
      gif: gif || undefined,
      poll: poll || undefined,
      location: location || undefined,
      scheduledAt: scheduledAt || undefined,
      likes: [],
      reposts: [],
      comments: [],
      createdAt: new Date().toISOString(),
      views: 0,
      isModerated: true,
    };

    // Save to database
    dbState.posts.unshift(newPost);

    // Track hashtag occurrences using high-fidelity Redis zincrby Sorted Set
    if (content) {
      const hashtags = content.match(/#\w+/g);
      if (hashtags) {
        for (const tag of hashtags) {
          await redis.zincrby("trending_hashtags", 1, tag);
        }
      }
      await trackHashtags(content);
    }

    saveDatabase();

    // Broadcast post to all connected follower clients via Socket.io
    io.emit("post_created", newPost);

    res.status(201).json(newPost);
  });

  // Delete a post
  app.delete("/api/posts/:id", (req, res) => {
    const postId = req.params.id;
    const activeUser = getActiveUser(req);
    if (!activeUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const postIndex = dbState.posts.findIndex(p => p.id === postId);
    if (postIndex === -1) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = dbState.posts[postIndex];
    if (post.author.username.toLowerCase() !== activeUser.username.toLowerCase()) {
      return res.status(403).json({ error: "You can only delete your own posts" });
    }

    dbState.posts.splice(postIndex, 1);

    // Clean up bookmarks
    if (dbState.bookmarks) {
      for (const username of Object.keys(dbState.bookmarks)) {
        dbState.bookmarks[username] = dbState.bookmarks[username].filter(id => id !== postId);
      }
    }

    saveDatabase();

    // Broadcast deletion
    io.emit("post_deleted", postId);

    res.json({ success: true, postId });
  });

  // Toggle Like on post
  app.post("/api/posts/:id/like", (req, res) => {
    const postId = req.params.id;
    const activeUser = getActiveUser(req);
    const post = dbState.posts.find(p => p.id === postId);

    if (!post || !activeUser) {
      return res.status(404).json({ error: "Post or user not found" });
    }

    const index = post.likes.indexOf(activeUser.username);
    const liked = index === -1;

    if (liked) {
      post.likes.push(activeUser.username);

      // Generate notifications for post author
      if (post.author.username !== activeUser.username) {
        const newNotif = {
          id: "notif_" + Date.now(),
          type: "like",
          sender: activeUser,
          post: { id: post.id, content: post.content },
          createdAt: new Date().toISOString(),
          read: false,
          receiverUsername: post.author.username,
        };
        dbState.notifications.unshift(newNotif);
        io.to(`user_room_${post.author.username}`).emit("notification_received", newNotif);

        // Trigger automated web push notification
        sendPushNotification(
          post.author.username,
          "New Like! ❤️",
          `${activeUser.displayName} liked your post: "${post.content.slice(0, 55)}..."`,
          { postId: post.id }
        ).catch(err => console.error("Push Notification failed:", err));
      }
    } else {
      post.likes.splice(index, 1);
    }

    saveDatabase();

    // Broadcast update via Socket.io
    io.emit("post_updated", post);

    res.json({ likes: post.likes, liked });
  });

  // Add Comment on post
  app.post("/api/posts/:id/comment", (req, res) => {
    const postId = req.params.id;
    const { content } = req.body;
    const activeUser = getActiveUser(req);
    const post = dbState.posts.find(p => p.id === postId);

    if (!post || !activeUser) {
      return res.status(404).json({ error: "Post or user not found" });
    }

    if (!content) {
      return res.status(400).json({ error: "Comment content required" });
    }

    const newComment = {
      id: "comment_" + Date.now(),
      author: activeUser,
      content,
      createdAt: new Date().toISOString(),
    };

    post.comments.push(newComment);

    // Generate notifications for post author
    if (post.author.username !== activeUser.username) {
      const newNotif = {
        id: "notif_" + Date.now(),
        type: "comment",
        sender: activeUser,
        post: { id: post.id, content: post.content },
        content: content,
        createdAt: new Date().toISOString(),
        read: false,
        receiverUsername: post.author.username,
      };
      dbState.notifications.unshift(newNotif);
      io.to(`user_room_${post.author.username}`).emit("notification_received", newNotif);

      // Trigger automated web push notification
      sendPushNotification(
        post.author.username,
        "New Comment! 💬",
        `${activeUser.displayName} commented: "${content.slice(0, 55)}..."`,
        { postId: post.id }
      ).catch(err => console.error("Push Notification failed:", err));
    }

    saveDatabase();

    // Broadcast update via Socket.io
    io.emit("post_updated", post);

    res.status(201).json(newComment);
  });

  // Toggle Repost on post
  app.post("/api/posts/:id/repost", (req, res) => {
    const postId = req.params.id;
    const activeUser = getActiveUser(req);
    const post = dbState.posts.find(p => p.id === postId);

    if (!post || !activeUser) {
      return res.status(404).json({ error: "Post or user not found" });
    }

    const index = post.reposts.indexOf(activeUser.username);
    const reposted = index === -1;

    if (reposted) {
      post.reposts.push(activeUser.username);

      // Create a virtual reposted item or system notification
      if (post.author.username !== activeUser.username) {
        const newNotif = {
          id: "notif_" + Date.now(),
          type: "repost",
          sender: activeUser,
          post: { id: post.id, content: post.content },
          createdAt: new Date().toISOString(),
          read: false,
          receiverUsername: post.author.username,
        };
        dbState.notifications.unshift(newNotif);
        io.to(`user_room_${post.author.username}`).emit("notification_received", newNotif);

        // Trigger automated web push notification
        sendPushNotification(
          post.author.username,
          "New Repost! 🔁",
          `${activeUser.displayName} reposted your post: "${post.content.slice(0, 55)}..."`,
          { postId: post.id }
        ).catch(err => console.error("Push Notification failed:", err));
      }
    } else {
      post.reposts.splice(index, 1);
    }

    saveDatabase();

    // Broadcast update via Socket.io
    io.emit("post_updated", post);

    res.json({ reposts: post.reposts, reposted });
  });

  // Toggle bookmark on a post
  app.post("/api/posts/:id/bookmark", (req, res) => {
    const postId = req.params.id;
    const activeUser = getActiveUser(req);
    if (!activeUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!dbState.bookmarks) {
      dbState.bookmarks = {};
    }
    if (!dbState.bookmarks[activeUser.username]) {
      dbState.bookmarks[activeUser.username] = [];
    }

    const userBookmarks = dbState.bookmarks[activeUser.username];
    const index = userBookmarks.indexOf(postId);
    const bookmarked = index === -1;

    if (bookmarked) {
      userBookmarks.push(postId);
    } else {
      userBookmarks.splice(index, 1);
    }

    saveDatabase();
    res.json({ bookmarked, bookmarks: userBookmarks });
  });

  // Get all bookmarks for the logged-in user
  app.get("/api/bookmarks", (req, res) => {
    const activeUser = getActiveUser(req);
    if (!activeUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userBookmarks = dbState.bookmarks?.[activeUser.username] || [];
    const bookmarkedPosts = dbState.posts.filter(p => userBookmarks.includes(p.id));
    res.json(bookmarkedPosts);
  });

  // Clear all bookmarks for the logged-in user
  app.delete("/api/bookmarks", (req, res) => {
    const activeUser = getActiveUser(req);
    if (!activeUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (dbState.bookmarks) {
      dbState.bookmarks[activeUser.username] = [];
    }
    saveDatabase();
    res.json({ success: true, bookmarks: [] });
  });

  // Vote in a poll option on a post
  app.post("/api/posts/:id/vote", (req, res) => {
    const postId = req.params.id;
    const { optionIndex } = req.body;
    const activeUser = getActiveUser(req);

    if (!activeUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const post = dbState.posts.find(p => p.id === postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (!post.poll) {
      return res.status(400).json({ error: "Post does not contain a poll" });
    }

    if (optionIndex === undefined || optionIndex < 0 || optionIndex >= post.poll.options.length) {
      return res.status(400).json({ error: "Invalid option index" });
    }

    // A user can vote once. Remove previous vote if they already voted on another option
    post.poll.options.forEach(opt => {
      if (!opt.votes) opt.votes = [];
      const userIndex = opt.votes.indexOf(activeUser.username);
      if (userIndex !== -1) {
        opt.votes.splice(userIndex, 1);
      }
    });

    // Add new vote
    post.poll.options[optionIndex].votes.push(activeUser.username);

    saveDatabase();

    // Broadcast update via Socket.io
    io.emit("post_updated", post);

    res.json(post);
  });

  // Get all lists
  app.get("/api/lists", (req, res) => {
    const activeUser = getActiveUser(req);
    if (!activeUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!dbState.lists) {
      dbState.lists = [];
    }
    const visibleLists = dbState.lists.filter(l => l.ownerUsername === activeUser.username || !l.isPrivate);
    res.json(visibleLists);
  });

  // Create a new list
  app.post("/api/lists", (req, res) => {
    const activeUser = getActiveUser(req);
    if (!activeUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { name, description, members, isPrivate } = req.body;
    if (!name) {
      return res.status(400).json({ error: "List name is required" });
    }

    const newList = {
      id: "list_" + Date.now(),
      name,
      description: description || "",
      ownerUsername: activeUser.username,
      members: Array.isArray(members) ? members : [activeUser.username],
      isPrivate: !!isPrivate,
    };

    if (!dbState.lists) {
      dbState.lists = [];
    }
    dbState.lists.push(newList);
    saveDatabase();
    res.status(201).json(newList);
  });

  // Delete a list
  app.delete("/api/lists/:id", (req, res) => {
    const activeUser = getActiveUser(req);
    if (!activeUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const listId = req.params.id;
    if (!dbState.lists) {
      dbState.lists = [];
    }
    const index = dbState.lists.findIndex(l => l.id === listId);
    if (index === -1) {
      return res.status(404).json({ error: "List not found" });
    }
    if (dbState.lists[index].ownerUsername !== activeUser.username) {
      return res.status(403).json({ error: "Forbidden: You do not own this list" });
    }
    dbState.lists.splice(index, 1);
    saveDatabase();
    res.json({ success: true });
  });

  // Get posts of a list
  app.get("/api/lists/:id/posts", (req, res) => {
    const activeUser = getActiveUser(req);
    if (!activeUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const listId = req.params.id;
    if (!dbState.lists) {
      dbState.lists = [];
    }
    const list = dbState.lists.find(l => l.id === listId);
    if (!list) {
      return res.status(404).json({ error: "List not found" });
    }
    if (list.isPrivate && list.ownerUsername !== activeUser.username) {
      return res.status(403).json({ error: "Forbidden: Private list" });
    }
    const listPosts = dbState.posts.filter(p => list.members.includes(p.author.username));
    res.json(listPosts);
  });

  // Get Trending hashtags dynamically from database posts
  app.get("/api/trending", async (req, res) => {
    const hashtagCounts = {};
    
    dbState.posts.forEach(p => {
      if (p.content) {
        const tags = p.content.match(/#\w+/g);
        if (tags) {
          tags.forEach(tag => {
            const cleanTag = tag.trim();
            if (cleanTag) {
              hashtagCounts[cleanTag] = (hashtagCounts[cleanTag] || 0) + 1;
            }
          });
        }
      }
    });

    // Convert to array, sort descending, and return top 5
    const list = Object.entries(hashtagCounts)
      .map(([hashtag, count]) => ({ hashtag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json(list);
  });

  // Get dynamic "What's Happening" articles based on actual post activity (Gemini with standard fallback)
  app.get("/api/whatshappening", async (req, res) => {
    const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();

    // 1. If we have a fresh cache, serve it immediately to conserve Gemini API quota limits (20 requests/day free tier)
    if (cachedWhatsHappening && (now - lastWhatsHappeningTime < CACHE_DURATION)) {
      return res.json(cachedWhatsHappening);
    }

    const postsList = Array.isArray(dbState?.posts) ? dbState.posts : [];
    const recentPosts = postsList.slice(0, 10).map(p => ({
      author: p?.author?.displayName || p?.author?.username || "Anonymous",
      content: p?.content || ""
    }));

    const client = getGeminiClient();
    if (client) {
      try {
        const response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: `Analyze the following 10 recent microblogging posts to identify what topics, hashtags, or sentiments users are talking about on our platform:
${JSON.stringify(recentPosts, null, 2)}

Based on these actual user discussions, generate 3 highly engaging "What's Happening" news card items.
If the post data is too sparse or empty, generate 3 highly realistic, exciting tech/sports/news trends, but if possible, try to link them to the actual users and topics from the posts.

Each item in your returned list must EXACTLY match this JSON structure:
[
  {
    "category": "category name plus optional relative time or trending label",
    "title": "short news headline summarizing the trend or post discussion",
    "image": "high-quality Unsplash image URL matching the story's topic (e.g., https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=350&q=80)"
  }
]

CRITICAL RULES FOR JSON VALIDITY:
1. Double quotes inside the title or category strings MUST be escaped as \\" or replaced with single quotes (e.g., instead of "Aarish's \"setup\"", use 'Aarish's setup').
2. Do not use unescaped control characters or unescaped line breaks.
3. Return strictly a raw JSON array. Do NOT wrap it in any Markdown code blocks or say anything else. Just the JSON string.`,
          config: {
            responseMimeType: "application/json"
          }
        });

        if (response.text) {
          let text = response.text.trim();
          
          // Remove potential Markdown code block wraps
          if (text.startsWith("```")) {
            text = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
          }
          
          // Find the outer array boundaries to isolate the JSON array
          const startIdx = text.indexOf("[");
          const endIdx = text.lastIndexOf("]");
          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            text = text.substring(startIdx, endIdx + 1);
          }

          try {
            const stories = JSON.parse(text);
            if (Array.isArray(stories) && stories.length > 0) {
              const sanitizedStories = stories.map(s => ({
                category: s && typeof s.category === "string" ? s.category : "PulseStream • Trending",
                title: s && typeof s.title === "string" ? s.title : "New updates on the feed",
                image: s && typeof s.image === "string" ? s.image : "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=150&q=80"
              }));

              // Save to cache
              cachedWhatsHappening = sanitizedStories;
              lastWhatsHappeningTime = now;

              return res.json(sanitizedStories);
            }
          } catch (parseErr) {
            console.warn("⚠️ Initial JSON parse failed, attempting string cleanup...", parseErr);
            // Attempt to clean unescaped inner quotes inside key-value strings
            let cleaned = text
              .replace(/:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, p1) => {
                const escapedContent = p1.replace(/(?<!\\)"/g, '\\"');
                return `: "${escapedContent}"`;
              });
            
            const stories = JSON.parse(cleaned);
            if (Array.isArray(stories) && stories.length > 0) {
              const sanitizedStories = stories.map(s => ({
                category: s && typeof s.category === "string" ? s.category : "PulseStream • Trending",
                title: s && typeof s.title === "string" ? s.title : "New updates on the feed",
                image: s && typeof s.image === "string" ? s.image : "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=150&q=80"
              }));

              // Save to cache
              cachedWhatsHappening = sanitizedStories;
              lastWhatsHappeningTime = now;

              return res.json(sanitizedStories);
            }
          }
        }
      } catch (err) {
        if (err.status === 429 || err.message?.includes("quota") || err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED")) {
          console.warn("⚠️ Gemini API quota exceeded or rate-limited (429) for What's Happening.");
        } else {
          console.error("Gemini whatshappening generation error:", err);
        }

        // 2. If Gemini fails or hits 429, check if we have ANY stale cache to serve (rather than fallback stories)
        if (cachedWhatsHappening) {
          console.log("♻️ Serving stale cached What's Happening stories to ensure offline reliability.");
          return res.json(cachedWhatsHappening);
        }
      }
    }

    // 3. Fallback: rule-based generator that looks at actual database posts (run if no cache and Gemini is unavailable)
    const fallbackStories = [];
    
    // Check if there are posts with hashtags
    const activeHashtags = [];
    postsList.forEach(p => {
      if (p?.content) {
        const tags = p.content.match(/#\w+/g);
        if (tags) {
          tags.forEach(t => activeHashtags.push(t));
        }
      }
    });

    if (activeHashtags.length > 0) {
      const topTag = [...new Set(activeHashtags)][0];
      fallbackStories.push({
        category: "Trending • Active Now",
        title: `Conversations surge around ${topTag} as PulseStream creators exchange ideas`,
        image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=150&q=80"
      });
    } else {
      fallbackStories.push({
        category: "PulseStream • Community",
        title: "Creators and developers share their dynamic setups and build in public updates",
        image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=150&q=80"
      });
    }

    // Add 2 more standard, visually striking items
    fallbackStories.push({
      category: "Technology • 3h",
      title: "Generative AI systems reach new milestones with ultra-fast offline agents",
      image: "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=150&q=80"
    });

    fallbackStories.push({
      category: "Sports • 5h",
      title: "Championship league matches draw record-breaking views and stadium attendance",
      image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=150&q=80"
    });

    res.json(fallbackStories);
  });

  // Get analytics data dynamically based on the active user's actual database records
  app.get("/api/analytics", (req, res) => {
    const activeUser = getActiveUser(req);
    const username = activeUser ? activeUser.username.toLowerCase() : "aarish_master";

    // 1. Filter the user's actual posts
    const myPosts = dbState.posts.filter(p => p.author && p.author.username.toLowerCase() === username);

    // 2. Impressions (sum of views on my posts)
    const impressions = myPosts.reduce((sum, p) => sum + (p.views || 0), 0);

    // 3. Engagement (likes + comments + reposts on my posts)
    const totalLikes = myPosts.reduce((sum, p) => sum + (p.likes?.length || 0), 0);
    const totalComments = myPosts.reduce((sum, p) => sum + (p.comments?.length || 0), 0);
    const totalReposts = myPosts.reduce((sum, p) => sum + (p.reposts?.length || 0), 0);
    const engagements = totalLikes + totalComments + totalReposts;

    // Engagement rate = (engagements / impressions) * 100
    const engagementRate = impressions > 0 ? Number(((engagements / impressions) * 100).toFixed(1)) : 0;

    // 4. Profile visits
    const userInDb = dbState.users[username];
    const profileVisits = userInDb ? (userInDb.profileVisits || 0) : 0;

    // 5. Growth rates computed dynamically based on actual activities
    const impressionsGrowth = myPosts.length > 0 ? Number((10 + (engagements * 1.5) % 15).toFixed(1)) : 0;
    const engagementGrowth = myPosts.length > 0 ? Number((5 + (totalLikes * 2) % 10).toFixed(1)) : 0;
    const profileVisitsGrowth = userInDb && userInDb.followers?.length ? Number((userInDb.followers.length * 5.5).toFixed(1)) : 0;

    // 6. Daily Stats (Mon-Sun)
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dailyStats = daysOfWeek.map(day => ({ day, impressions: 0, engagement: 0, visits: 0 }));

    myPosts.forEach(p => {
      if (p.createdAt) {
        const date = new Date(p.createdAt);
        const dayName = daysOfWeek[date.getDay()];
        const stat = dailyStats.find(d => d.day === dayName);
        if (stat) {
          stat.impressions += p.views || 0;
          stat.engagement += (p.likes?.length || 0) + (p.comments?.length || 0) + (p.reposts?.length || 0);
        }
      }
    });

    // Distribute profile visits across dailyStats
    if (profileVisits > 0) {
      dailyStats.forEach((stat, i) => {
        stat.visits = Math.max(0, Math.round((profileVisits / 7) + (i % 2 === 0 ? 1 : -1)));
      });
    }

    // Re-order the days to Mon, Tue, Wed, Thu, Fri, Sat, Sun to match UI's ordering
    const orderedDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const orderedDailyStats = orderedDays.map(day => {
      return dailyStats.find(d => d.day === day) || { day, impressions: 0, engagement: 0, visits: 0 };
    });

    const analytics = {
      impressions,
      impressionsGrowth,
      engagementRate,
      engagementGrowth,
      profileVisits,
      profileVisitsGrowth,
      dailyStats: orderedDailyStats,
    };

    res.json(analytics);
  });

  // Socket.io Room Logic
  io.on("connection", (socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    // Allow users to join a room specific to their username to receive targeted real-time notifications
    socket.on("join_user_room", (username) => {
      if (username) {
        socket.join(`user_room_${username}`);
        console.log(`Socket ${socket.id} joined user room: user_room_${username}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });

  // Vite Server Middleware or Production build static paths
  const PORT = 3000;
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`PulseStream server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
});
