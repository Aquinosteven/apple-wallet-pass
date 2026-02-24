import test from "node:test";
import assert from "node:assert/strict";
import { clearAllLimiters, createTokenBucketLimiter } from "../lib/rateLimit.js";

test("token bucket allows within capacity then blocks", () => {
  clearAllLimiters();
  const limiter = createTokenBucketLimiter({
    scope: "test_capacity",
    capacity: 3,
    windowSeconds: 60,
  });

  assert.equal(limiter("ip-1", { nowMs: 1_000 }).allowed, true);
  assert.equal(limiter("ip-1", { nowMs: 1_001 }).allowed, true);
  assert.equal(limiter("ip-1", { nowMs: 1_002 }).allowed, true);
  const blocked = limiter("ip-1", { nowMs: 1_003 });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds > 0, true);
});

test("token bucket refills over time", () => {
  clearAllLimiters();
  const limiter = createTokenBucketLimiter({
    scope: "test_refill",
    capacity: 2,
    windowSeconds: 20,
  });

  assert.equal(limiter("ip-2", { nowMs: 0 }).allowed, true);
  assert.equal(limiter("ip-2", { nowMs: 1 }).allowed, true);
  assert.equal(limiter("ip-2", { nowMs: 2 }).allowed, false);

  const afterRefill = limiter("ip-2", { nowMs: 10_500 });
  assert.equal(afterRefill.allowed, true);
});

test("different keys have isolated buckets", () => {
  clearAllLimiters();
  const limiter = createTokenBucketLimiter({
    scope: "test_isolation",
    capacity: 1,
    windowSeconds: 60,
  });

  assert.equal(limiter("token-A", { nowMs: 5 }).allowed, true);
  assert.equal(limiter("token-A", { nowMs: 6 }).allowed, false);
  assert.equal(limiter("token-B", { nowMs: 6 }).allowed, true);
});
