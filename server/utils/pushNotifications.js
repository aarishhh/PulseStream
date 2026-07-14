import webpush from "web-push";
import mongoose from "mongoose";
import Subscription from "../models/Subscription.js";
import { webPushConfig } from "../config/db.js";

const SubscriptionModel = Subscription;

// Fallback in-memory list of subscriptions for local JSON DB mode
const localSubscriptions = [];

export const saveSubscription = async (username, sub) => {
  const cleanUsername = username.toLowerCase();
  
  // Check if we are running Mongoose mode
  const isMongo = mongoose.connection.readyState === 1;

  if (isMongo) {
    try {
      // Find existing or create new subscription
      await SubscriptionModel.findOneAndUpdate(
        { endpoint: sub.endpoint },
        {
          username: cleanUsername,
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys?.p256dh || "",
            auth: sub.keys?.auth || ""
          }
        },
        { upsert: true, new: true }
      );
      console.log(`📡 Registered Web Push Subscription in MongoDB for @${cleanUsername}`);
    } catch (err) {
      console.error("❌ Failed to register push subscription in MongoDB:", err);
    }
    return;
  }

  // Fallback mode
  const index = localSubscriptions.findIndex(item => item.subscription.endpoint === sub.endpoint);
  if (index !== -1) {
    localSubscriptions[index].username = cleanUsername;
  } else {
    localSubscriptions.push({ username: cleanUsername, subscription: sub });
  }
  console.log(`📡 Registered Web Push Subscription in-memory for @${cleanUsername}`);
};

export const sendPushNotification = async (
  username,
  title,
  body,
  payloadData
) => {
  const cleanUsername = username.toLowerCase();

  // Guard if Web Push config is disabled or VAPID is not active
  if (!webPushConfig.active) {
    console.log(`⚠️ Push skipped for @${cleanUsername} (Web Push VAPID inactive): ${title} - ${body}`);
    return;
  }

  const isMongo = mongoose.connection.readyState === 1;
  let subsToNotify = [];

  if (isMongo) {
    try {
      subsToNotify = await SubscriptionModel.find({ username: cleanUsername });
    } catch (err) {
      console.error("❌ Failed to query push subscriptions from MongoDB:", err);
    }
  } else {
    subsToNotify = localSubscriptions
      .filter(item => item.username === cleanUsername)
      .map(item => item.subscription);
  }

  if (subsToNotify.length === 0) {
    console.log(`ℹ️ No registered web push subscriptions found for @${cleanUsername}`);
    return;
  }

  console.log(`📣 Sending web push notifications to ${subsToNotify.length} devices for @${cleanUsername}`);

  const notificationPayload = JSON.stringify({
    notification: {
      title,
      body,
      icon: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&h=150&q=80",
      vibrate: [100, 50, 100],
      data: payloadData || {},
    }
  });

  for (const s of subsToNotify) {
    // format standard subscription object for web-push library
    const pushSub = isMongo ? {
      endpoint: s.endpoint,
      keys: {
        p256dh: s.keys.p256dh,
        auth: s.keys.auth
      }
    } : s;

    try {
      await webpush.sendNotification(pushSub, notificationPayload);
      console.log(`✅ Push notification sent successfully to endpoint ${pushSub.endpoint.slice(0, 30)}...`);
    } catch (error) {
      console.error("❌ Web Push error (stale subscription):", error.statusCode, error.message);
      // Clean up failed/expired subscription if we received a 410 Gone or 404 Not Found response
      if (error.statusCode === 410 || error.statusCode === 404) {
        if (isMongo) {
          await SubscriptionModel.deleteOne({ endpoint: pushSub.endpoint });
          console.log(`🧹 Removed expired MongoDB subscription for @${cleanUsername}`);
        } else {
          const idx = localSubscriptions.findIndex(item => item.subscription.endpoint === pushSub.endpoint);
          if (idx !== -1) {
            localSubscriptions.splice(idx, 1);
            console.log(`🧹 Removed expired in-memory subscription for @${cleanUsername}`);
          }
        }
      }
    }
  }
};
