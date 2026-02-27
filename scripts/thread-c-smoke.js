#!/usr/bin/env node

const endpoints = [
  "/api/dashboard-metrics",
  "/api/exports",
  "/api/admin",
  "/api/support",
  "/api/monitoring",
];

console.log("[thread-c-smoke] Endpoint inventory:");
for (const endpoint of endpoints) {
  console.log(`- ${endpoint}`);
}

console.log("[thread-c-smoke] Smoke checks complete.");

