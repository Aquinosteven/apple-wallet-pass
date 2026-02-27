#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.join(process.cwd(), "supabase", "supabase", "migrations");

if (!fs.existsSync(migrationsDir)) {
  console.error(`missing migrations directory: ${migrationsDir}`);
  process.exit(1);
}

const files = fs
  .readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.error("no migration files found");
  process.exit(1);
}

const byVersion = new Map();
for (const file of files) {
  const version = file.match(/^(\d+)/)?.[1] || "";
  if (!version) {
    console.error(`invalid migration filename (missing numeric version): ${file}`);
    process.exit(1);
  }
  const list = byVersion.get(version) || [];
  list.push(file);
  byVersion.set(version, list);
}

const duplicates = [...byVersion.entries()].filter(([, list]) => list.length > 1);
if (duplicates.length > 0) {
  for (const [version, list] of duplicates) {
    console.error(`duplicate migration version ${version}: ${list.join(", ")}`);
  }
  process.exit(1);
}

console.log(`PASS: ${files.length} migration file(s), all versions unique in ${migrationsDir}`);

