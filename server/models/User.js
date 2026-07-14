import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
  displayName: { type: String, required: true, trim: true },
  avatar: { type: String, default: "" },
  banner: { type: String, default: "" },
  bio: { type: String, default: "" },
  location: { type: String, default: "" },
  joinedDate: { type: String, default: "" },
  website: { type: String, default: "" },
  followers: [{ type: String }], // store usernames for fast lookups
  following: [{ type: String }], // store usernames for fast lookups
  badges: [{ type: String, default: [] }],
  analytics: {
    impressions: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 },
    profileVisits: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.User || mongoose.model("User", UserSchema);
