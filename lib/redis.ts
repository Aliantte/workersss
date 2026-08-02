import { Redis } from "@upstash/redis";
import type { FeedItem } from "./types";

const FEED_KEY = "worker-bots:feed";
const FEED_MAX_LENGTH = 100;

export function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN. Add the Upstash integration in your Vercel project, or set these env vars locally."
    );
  }
  return new Redis({ url, token });
}

export async function pushFeedItem(item: FeedItem) {
  const redis = getRedis();
  await redis.lpush(FEED_KEY, JSON.stringify(item));
  await redis.ltrim(FEED_KEY, 0, FEED_MAX_LENGTH - 1);
}

export async function getFeed(limit = 40): Promise<FeedItem[]> {
  const redis = getRedis();
  const raw = await redis.lrange(FEED_KEY, 0, limit - 1);
  return raw
    .map((entry) => {
      try {
        return typeof entry === "string" ? (JSON.parse(entry) as FeedItem) : (entry as FeedItem);
      } catch {
        return null;
      }
    })
    .filter((x): x is FeedItem => x !== null);
}
