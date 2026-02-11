import { HttpError } from "@/server/http";

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export function assertRateLimit(key: string, options: RateLimitOptions) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return;
  }

  if (current.count >= options.limit) {
    throw new HttpError(429, "rate_limited", "Too many requests, please try again later.");
  }

  current.count += 1;
  buckets.set(key, current);
}
