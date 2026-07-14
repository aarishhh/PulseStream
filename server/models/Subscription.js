import mongoose, { Schema } from "mongoose";

const SubscriptionSchema = new Schema({
  username: { type: String, required: true, index: true },
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Subscription || mongoose.model("Subscription", SubscriptionSchema);
