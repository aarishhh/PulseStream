import mongoose, { Schema } from "mongoose";

const PostSchema = new Schema({
  authorUsername: { type: String, required: true, ref: "User", index: true },
  content: { type: String, required: true, trim: true },
  image: { type: String, default: "" },
  likes: [{ type: String }], // list of usernames who liked
  reposts: [{ type: String }], // list of usernames who reposted
  views: { type: Number, default: 0 },
  category: { type: String, default: "General" },
  tags: [{ type: String, default: [] }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Post || mongoose.model("Post", PostSchema);
