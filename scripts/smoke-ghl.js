import ghlPassHandler from "../api/ghl-pass.js";
import joinHandler from "../api/join.js";

function createReq({ method, headers = {}, body, query = {}, url = "/" }) {
  return {
    method,
    headers,
    body,
    query,
    url,
    on() {},
  };
}

function createRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: undefined,
    writableEnded: false,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    getHeader(name) {
      return this.headers[name.toLowerCase()];
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.setHeader("content-type", "application/json");
      this.body = payload;
      this.writableEnded = true;
      return this;
    },
    send(payload) {
      this.body = payload;
      this.writableEnded = true;
      return this;
    },
    end(payload) {
      if (payload !== undefined) this.body = payload;
      this.writableEnded = true;
      return this;
    },
  };
  return res;
}

async function main() {
  process.env.GHL_PASS_SECRET = process.env.GHL_PASS_SECRET || "local-dev-secret";
  const expectedBase = "https://apple-wallet-pass-six.vercel.app";
  const zoomUrl = "https://zoom.us/j/123456789?pwd=abc123slug";

  async function runCase(caseName, headers, vercelUrl) {
    if (vercelUrl) process.env.VERCEL_URL = vercelUrl;
    else delete process.env.VERCEL_URL;
    delete process.env.VERCEL_BRANCH_URL;

    const postReq = createReq({
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: {
        attendee: { name: "Jane Doe", email: "jane@example.com", phone: "+15551234567" },
        event: {
          title: "Demo Event",
          startsAt: "2026-03-01T19:00:00-05:00",
          joinUrl: zoomUrl,
        },
      },
      url: "/api/ghl-pass",
    });
    const postRes = createRes();
    await ghlPassHandler(postReq, postRes);

    const shortJoinUrl = postRes.body?.shortJoinUrl || "";
    const shortJoinOk =
      postRes.statusCode === 200 && shortJoinUrl.startsWith(`${expectedBase}/api/join?token=`);

    let redirectOk = false;
    let joinStatus = -1;
    let joinLocation = "";
    if (shortJoinUrl) {
      const parsed = new URL(shortJoinUrl);
      const token = parsed.searchParams.get("token") || "";
      const joinReq = createReq({
        method: "GET",
        headers,
        query: { token },
        url: `/api/join?token=${encodeURIComponent(token)}`,
      });
      const joinRes = createRes();
      await joinHandler(joinReq, joinRes);
      joinStatus = joinRes.statusCode;
      joinLocation = joinRes.getHeader("location") || "";
      redirectOk = joinStatus === 302 && joinLocation === zoomUrl;
    }

    console.log(`${caseName} shortJoinUrl: ${shortJoinUrl}`);
    console.log(
      `${caseName} shortJoinUrl check: ${shortJoinOk ? "PASS" : "FAIL"}`
    );
    console.log(
      `${caseName} redirect check: ${redirectOk ? "PASS" : "FAIL"} (status=${joinStatus}, location=${joinLocation})`
    );
  }

  await runCase(
    "Case A",
    {
      "x-forwarded-proto": "https",
      "x-forwarded-host": "apple-wallet-pass-six.vercel.app",
    },
    null
  );

  await runCase("Case B", {}, "apple-wallet-pass-six.vercel.app");

  const longJoinUrl = `https://zoom.us/j/${"a".repeat(2600)}`;
  const caseCReq = createReq({
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-proto": "https",
      "x-forwarded-host": "apple-wallet-pass-six.vercel.app",
    },
    body: {
      attendee: { name: "Jane Doe", email: "jane@example.com", phone: "+15551234567" },
      event: {
        title: "Demo Event",
        startsAt: "2026-03-01T19:00:00-05:00",
        joinUrl: longJoinUrl,
      },
    },
    url: "/api/ghl-pass",
  });
  const caseCRes = createRes();
  await ghlPassHandler(caseCReq, caseCRes);

  const caseCBody = caseCRes.body || {};
  const caseCDetails = caseCBody.details || {};
  const caseCStatusOk = caseCRes.statusCode === 400;
  const caseCErrorOk = caseCBody.error === "URL_TOO_LONG";
  const caseCShortLenOk = Number(caseCDetails.shortJoinUrlLength) > 1900;
  const caseCJoinLenOk = Number(caseCDetails.joinUrlLength) >= 2600;

  console.log(`Case C status check: ${caseCStatusOk ? "PASS" : "FAIL"} (status=${caseCRes.statusCode})`);
  console.log(`Case C error check: ${caseCErrorOk ? "PASS" : "FAIL"} (error=${caseCBody.error || ""})`);
  console.log(
    `Case C shortJoinUrlLength check: ${caseCShortLenOk ? "PASS" : "FAIL"} (shortJoinUrlLength=${caseCDetails.shortJoinUrlLength})`
  );
  console.log(
    `Case C joinUrlLength check: ${caseCJoinLenOk ? "PASS" : "FAIL"} (joinUrlLength=${caseCDetails.joinUrlLength})`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
