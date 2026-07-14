import mongoose, { Schema } from "mongoose";

const MessageSchema = new Schema({
  senderUsername: { type: String, required: true, ref: "User", index: true },
  receiverUsername: { type: String, required: true, ref: "User", index: true },
  content: { type: String, required: true, trim: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Message || mongoose.model("Message", MessageSchema);
