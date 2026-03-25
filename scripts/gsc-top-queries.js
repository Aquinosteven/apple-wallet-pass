import process from "node:process";
import { getAuthorizedClient, getGscConfig, googleJsonRequest } from "./gsc-client.js";

function parseArgs(argv) {
  const out = {
    days: 28,
    limit: 25,
    json: false,
    siteUrl: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") {
      out.json = true;
      continue;
    }
    if (arg === "--days") {
      out.days = Number.parseInt(argv[i + 1] || "28", 10);
      i += 1;
      continue;
    }
    if (arg === "--limit") {
      out.limit = Number.parseInt(argv[i + 1] || "25", 10);
      i += 1;
      continue;
    }
    if (arg === "--site-url") {
      out.siteUrl = String(argv[i + 1] || "").trim();
      i += 1;
    }
  }

  return out;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function buildDateRange(days) {
  const safeDays = Number.isInteger(days) && days > 1 ? days : 28;
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (safeDays - 1));
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

function normalizeRows(rows) {
  return rows.map((row) => ({
    query: String(Array.isArray(row.keys) ? row.keys[0] || "" : "").trim(),
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Number(row.ctr || 0),
    position: Number(row.position || 0),
  }));
}

function sortRows(rows) {
  return [...rows].sort((left, right) => {
    if (right.impressions !== left.impressions) return right.impressions - left.impressions;
    if (right.clicks !== left.clicks) return right.clicks - left.clicks;
    return left.position - right.position;
  });
}

function printTable(rows, meta) {
  console.log(`Property: ${meta.siteUrl}`);
  console.log(`Date range: ${meta.startDate} to ${meta.endDate}`);
  console.log("Top queries by impressions");
  for (const row of rows) {
    const position = Number.isFinite(row.position) ? row.position.toFixed(1) : "";
    const ctr = Number.isFinite(row.ctr) ? `${(row.ctr * 100).toFixed(2)}%` : "";
    console.log(
      `${row.query}\tpos ${position}\timpr ${row.impressions}\tclicks ${row.clicks}\tctr ${ctr}`
    );
  }
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

  const { startDate, endDate } = buildDateRange(args.days);
  const client = await getAuthorizedClient(config);
  const payload = await googleJsonRequest(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      client,
      body: {
        startDate,
        endDate,
        dimensions: ["query"],
        rowLimit: Math.max(args.limit * 4, 100),
        startRow: 0,
      },
    }
  );

  const rows = sortRows(normalizeRows(Array.isArray(payload.rows) ? payload.rows : [])).slice(
    0,
    Math.max(1, args.limit)
  );
  const result = {
    siteUrl,
    startDate,
    endDate,
    rows,
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (!rows.length) {
    console.log(`No query data returned for ${siteUrl} from ${startDate} to ${endDate}.`);
    return;
  }

  printTable(rows, result);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
