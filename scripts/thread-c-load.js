#!/usr/bin/env node

const iterations = Number(process.env.THREAD_C_LOAD_ITERATIONS || 200);
const jobs = Number(process.env.THREAD_C_LOAD_CONCURRENCY || 10);
const startedAt = Date.now();
let completed = 0;

function fakeTask() {
  return new Promise((resolve) => {
    const delayMs = 2 + Math.floor(Math.random() * 4);
    setTimeout(resolve, delayMs);
  });
}

async function worker() {
  while (completed < iterations) {
    completed += 1;
    await fakeTask();
  }
}

async function run() {
  console.log(`[thread-c-load] iterations=${iterations} concurrency=${jobs}`);
  await Promise.all(Array.from({ length: jobs }, () => worker()));
  const elapsed = Date.now() - startedAt;
  console.log(`[thread-c-load] completed=${iterations} elapsedMs=${elapsed}`);
}

run().catch((error) => {
  console.error("[thread-c-load] failed", error);
  process.exit(1);
});

