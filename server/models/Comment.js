import mongoose, { Schema } from "mongoose";

const CommentSchema = new Schema({
  postId: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
  authorUsername: { type: String, required: true, ref: "User" },
  content: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Comment || mongoose.model("Comment", CommentSchema);
