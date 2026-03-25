import process from "node:process";
import { getAuthorizedClient, getGscConfig, googleJsonRequest } from "./gsc-client.js";

const TARGET_KEYWORDS = [
  "apple wallet pass software",
  "google wallet pass software",
  "wallet pass software",
  "digital wallet pass software",
  "event wallet pass software",
  "event wallet passes",
  "webinar wallet pass",
  "webinar reminder software",
  "webinar attendance software",
  "webinar show rate",
  "booked call reminders",
  "appointment reminder software",
  "no show reduction software",
  "reduce no shows",
  "no show reminder software",
  "sales call reminder software",
  "calendar reminder software for events",
  "event reminder software",
  "apple wallet event ticket",
  "google wallet event ticket",
  "mobile wallet marketing",
  "wallet pass marketing",
  "highlevel wallet pass",
  "gohighlevel wallet pass",
  "gohighlevel appointment reminders",
];

function parseArgs(argv) {
  const out = {
    days: 28,
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

async function fetchKeywordRow({ client, siteUrl, keyword, startDate, endDate }) {
  const payload = await googleJsonRequest(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      client,
      body: {
        startDate,
        endDate,
        dimensions: ["query", "page"],
        rowLimit: 25,
        dimensionFilterGroups: [
          {
            groupType: "and",
            filters: [
              {
                dimension: "query",
                operator: "equals",
                expression: keyword,
              },
            ],
          },
        ],
      },
    }
  );

  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  if (!rows.length) {
    return {
      keyword,
      status: "no_data",
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: null,
      page: null,
    };
  }

  const best = [...rows].sort((left, right) => {
    const leftImpressions = Number(left.impressions || 0);
    const rightImpressions = Number(right.impressions || 0);
    if (rightImpressions !== leftImpressions) return rightImpressions - leftImpressions;
    return Number(left.position || 9999) - Number(right.position || 9999);
  })[0];

  const keys = Array.isArray(best.keys) ? best.keys : [];
  return {
    keyword,
    status: "ranking",
    clicks: Number(best.clicks || 0),
    impressions: Number(best.impressions || 0),
    ctr: Number(best.ctr || 0),
    position: Number.isFinite(Number(best.position)) ? Number(best.position) : null,
    page: typeof keys[1] === "string" ? keys[1] : null,
  };
}

function printRows(result) {
  console.log(`Property: ${result.siteUrl}`);
  console.log(`Date range: ${result.startDate} to ${result.endDate}`);
  console.log("Tracked keyword snapshot");
  for (const row of result.rows) {
    if (row.status !== "ranking") {
      console.log(`${row.keyword}\tno data`);
      continue;
    }
    const position = row.position == null ? "" : row.position.toFixed(1);
    const ctr = `${(row.ctr * 100).toFixed(2)}%`;
    console.log(
      `${row.keyword}\tpos ${position}\timpr ${row.impressions}\tclicks ${row.clicks}\tctr ${ctr}\tpage ${row.page || ""}`
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
  const rows = [];
  for (const keyword of TARGET_KEYWORDS) {
    rows.push(await fetchKeywordRow({ client, siteUrl, keyword, startDate, endDate }));
  }

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

  printRows(result);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
