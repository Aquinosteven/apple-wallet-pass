const buckets = new Map();
let warnedAboutInMemory = false;

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nowMs() {
  return Date.now();
}

function refillTokens(bucket, now) {
  if (now <= bucket.lastRefillMs) return;
  const elapsedMs = now - bucket.lastRefillMs;
  const refill = (elapsedMs / 1000) * bucket.refillPerSecond;
  bucket.tokens = Math.min(bucket.capacity, bucket.tokens + refill);
  bucket.lastRefillMs = now;
}

function bucketKey(scope, key) {
  return `${scope}:${key}`;
}

function getOrCreateBucket(scope, key, capacity, refillPerSecond, now) {
  const keyName = bucketKey(scope, key);
  let bucket = buckets.get(keyName);
  if (!bucket) {
    bucket = {
      capacity,
      refillPerSecond,
      tokens: capacity,
      lastRefillMs: now,
      updatedAtMs: now,
    };
    buckets.set(keyName, bucket);
    return bucket;
  }

  bucket.capacity = capacity;
  bucket.refillPerSecond = refillPerSecond;
  refillTokens(bucket, now);
  bucket.updatedAtMs = now;
  return bucket;
}

export function createTokenBucketLimiter(options = {}) {
  const capacity = toNumber(options.capacity, 10);
  const windowSeconds = toNumber(options.windowSeconds, 60);
  const tokensPerRequest = toNumber(options.tokensPerRequest, 1);
  const refillPerSecond = capacity / windowSeconds;
  const scope = String(options.scope || "global");

  return function consume(key, extra = {}) {
    const safeKey = String(key || "unknown").slice(0, 240);
    const now = Number.isFinite(extra.nowMs) ? extra.nowMs : nowMs();
    const bucket = getOrCreateBucket(scope, safeKey, capacity, refillPerSecond, now);

    if (bucket.tokens >= tokensPerRequest) {
      bucket.tokens -= tokensPerRequest;
      return {
        allowed: true,
        retryAfterSeconds: 0,
        remaining: Math.max(0, Math.floor(bucket.tokens)),
      };
    }

    const deficit = tokensPerRequest - bucket.tokens;
    const retryAfterSeconds = Math.max(1, Math.ceil(deficit / refillPerSecond));
    return {
      allowed: false,
      retryAfterSeconds,
      remaining: 0,
    };
  };
}

export function readLimiterConfigFromEnv() {
  if (!warnedAboutInMemory && process.env.VERCEL) {
    warnedAboutInMemory = true;
    console.warn(
      "[rate-limit] Using in-memory limiter. Limits are per-instance and may reset on serverless cold starts."
    );
  }
  return {
    claimReadPerMin: toNumber(process.env.RATE_LIMIT_CLAIM_READ_PER_MIN, 30),
    generatePerMin: toNumber(process.env.RATE_LIMIT_GENERATE_PER_MIN, 10),
    claimTokenPerMin: toNumber(process.env.RATE_LIMIT_CLAIM_TOKEN_PER_MIN, 10),
  };
}

const defaults = readLimiterConfigFromEnv();

export const limiters = {
  claimReadByIp: createTokenBucketLimiter({
    scope: "claim_read_ip",
    capacity: defaults.claimReadPerMin,
    windowSeconds: 60,
  }),
  generateByIp: createTokenBucketLimiter({
    scope: "generate_ip",
    capacity: defaults.generatePerMin,
    windowSeconds: 60,
  }),
  claimByToken: createTokenBucketLimiter({
    scope: "claim_token",
    capacity: defaults.claimTokenPerMin,
    windowSeconds: 60,
  }),
};

export function clearAllLimiters() {
  buckets.clear();
}
