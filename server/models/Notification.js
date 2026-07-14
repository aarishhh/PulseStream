import mongoose, { Schema } from "mongoose";

const NotificationSchema = new Schema({
  receiverUsername: { type: String, required: true, ref: "User", index: true },
  type: { type: String, enum: ["like", "comment", "follow", "repost"], required: true },
  senderUsername: { type: String, required: true, ref: "User" },
  postId: { type: String, default: "" },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
