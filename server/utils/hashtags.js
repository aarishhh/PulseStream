import { getRedisClient } from "../config/db.js";

// Helper to extract hashtags from text
export const extractHashtags = (text) => {
  if (!text) return [];
  const matches = text.match(/#\w+/g);
  if (!matches) return [];
  // return unique lowercase hashtags (stripping the # symbol)
  return Array.from(new Set(matches.map(tag => tag.slice(1).toLowerCase())));
};

// Track hashtags in Redis sorted set
export const trackHashtags = async (text) => {
  const hashtags = extractHashtags(text);
  if (hashtags.length === 0) return;

  const redis = getRedisClient();
  try {
    for (const tag of hashtags) {
      await redis.zIncrBy("trending_hashtags", 1, tag);
    }
    console.log(`📈 Incremented Redis sorted set score for tags: ${hashtags.join(", ")}`);
  } catch (error) {
    console.error("❌ Failed to track hashtags in Redis:", error);
  }
};

// Get top 5 trending hashtags from Redis
export const getTrendingHashtags = async () => {
  const redis = getRedisClient();
  try {
    const rawTrending = await redis.zRevRangeWithScores("trending_hashtags", 0, 4);
    // Redis library formats differ slightly, parse the outputs gracefully
    return rawTrending.map((item) => {
      // Handles both { value: 'tag', score: 5 } and native formats
      const hashtag = item.value !== undefined ? item.value : (item.member !== undefined ? item.member : String(item));
      const count = item.score !== undefined ? Number(item.score) : 1;
      return { hashtag, count };
    });
  } catch (error) {
    console.error("❌ Failed to fetch trending hashtags from Redis:", error);
    return [];
  }
};
