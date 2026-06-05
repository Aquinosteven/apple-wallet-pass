import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { getAuthorizedClient, getGscConfig, googleJsonRequest } from "./gsc-client.js";

function parseArgs(argv) {
  const out = {
    days: 90,
    rowLimit: 250,
    siteUrl: "",
    output: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--days") {
      out.days = Number.parseInt(argv[i + 1] || String(out.days), 10);
      i += 1;
      continue;
    }
    if (arg === "--row-limit") {
      out.rowLimit = Number.parseInt(argv[i + 1] || String(out.rowLimit), 10);
      i += 1;
      continue;
    }
    if (arg === "--site-url") {
      out.siteUrl = String(argv[i + 1] || "").trim();
      i += 1;
      continue;
    }
    if (arg === "--output") {
      out.output = String(argv[i + 1] || "").trim();
      i += 1;
    }
  }

  return out;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function buildDateRange(days) {
  const safeDays = Number.isInteger(days) && days > 1 ? days : 90;
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (safeDays - 1));
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

function normalizeRows(rows, dimensions) {
  return rows.map((row) => {
    const keys = Array.isArray(row.keys) ? row.keys : [];
    const normalized = {
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
      ctr: Number(row.ctr || 0),
      position: Number(row.position || 0),
    };

    dimensions.forEach((dimension, index) => {
      normalized[dimension] = String(keys[index] || "").trim();
    });

    return normalized;
  });
}

function sortRows(rows) {
  return [...rows].sort((left, right) => {
    if (right.impressions !== left.impressions) return right.impressions - left.impressions;
    if (right.clicks !== left.clicks) return right.clicks - left.clicks;
    return left.position - right.position;
  });
}

async function fetchRows({ client, siteUrl, startDate, endDate, dimensions, rowLimit }) {
  const payload = await googleJsonRequest(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      client,
      body: {
        startDate,
        endDate,
        dimensions,
        rowLimit,
        startRow: 0,
      },
    }
  );

  return sortRows(normalizeRows(Array.isArray(payload.rows) ? payload.rows : [], dimensions));
}

function summarize(rows) {
  return rows.reduce(
    (acc, row) => {
      acc.clicks += row.clicks;
      acc.impressions += row.impressions;
      return acc;
    },
    { clicks: 0, impressions: 0 }
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = getGscConfig();
  const siteUrl = args.siteUrl || config.siteUrl;
  if (!siteUrl) {
    throw new Error(
      "Missing Search Console property. Set GOOGLE_SEARCH_CONSOLE_SITE_URL or pass --site-url."
    );
  }

  const rowLimit = Number.isInteger(args.rowLimit) && args.rowLimit > 0 ? args.rowLimit : 250;
  const { startDate, endDate } = buildDateRange(args.days);
  const client = await getAuthorizedClient(config);

  const [queries, pages, queryPages] = await Promise.all([
    fetchRows({ client, siteUrl, startDate, endDate, dimensions: ["query"], rowLimit }),
    fetchRows({ client, siteUrl, startDate, endDate, dimensions: ["page"], rowLimit }),
    fetchRows({ client, siteUrl, startDate, endDate, dimensions: ["query", "page"], rowLimit }),
  ]);

  const baseline = {
    generatedAt: new Date().toISOString(),
    siteUrl,
    startDate,
    endDate,
    rowLimit,
    summary: {
      queries: summarize(queries),
      pages: summarize(pages),
      queryPages: summarize(queryPages),
    },
    queries,
    pages,
    queryPages,
  };

  const outputPath = args.output || path.join("traffic", `gsc-baseline-${startDate}_to_${endDate}.json`);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");

  console.log(`Wrote Search Console baseline to ${outputPath}`);
  console.log(`Queries: ${queries.length}, pages: ${pages.length}, query-page rows: ${queryPages.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
