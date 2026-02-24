#!/usr/bin/env node

const target = process.argv[2] || "http://localhost:3000/api/claim";
const count = Number(process.argv[3] || 40);
const token = process.argv[4] || "a".repeat(64);

async function run() {
  let okCount = 0;
  let limitedCount = 0;
  const statuses = new Map();

  for (let i = 0; i < count; i += 1) {
    const response = await fetch(`${target}?token=${encodeURIComponent(token)}`, {
      headers: {
        "user-agent": "rate-limit-hammer/1.0",
      },
    });

    statuses.set(response.status, (statuses.get(response.status) || 0) + 1);
    if (response.status === 429) {
      limitedCount += 1;
      const payload = await response.json().catch(() => ({}));
      console.log(`request=${i + 1} status=429 retryAfterSeconds=${payload.retryAfterSeconds ?? "?"}`);
    } else if (response.ok) {
      okCount += 1;
    }
  }

  console.log("\\nSummary");
  console.log(`target=${target}`);
  console.log(`requests=${count}`);
  console.log(`ok=${okCount}`);
  console.log(`rate_limited=${limitedCount}`);
  console.log(`status_breakdown=${JSON.stringify(Object.fromEntries(statuses))}`);

  if (limitedCount === 0) {
    console.error("No 429 responses observed. Increase request count or lower RATE_LIMIT_* values.");
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
