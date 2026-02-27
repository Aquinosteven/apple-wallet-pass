function parseJsonIfNeeded(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

async function sendViaResend(payload) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) return { ok: false, error: "Missing RESEND_API_KEY" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseBody = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      ok: false,
      error: String(responseBody?.message || responseBody?.error || `Resend error ${response.status}`),
    };
  }
  return { ok: true };
}

export async function sendSupportEmail({ subject, text, ticketId, requesterEmail }) {
  const provider = String(process.env.MAIL_PROVIDER || "log").trim().toLowerCase();
  const fromAddress = String(process.env.MAIL_FROM_ADDRESS || "hello@showfi.io").trim();
  const toAddress = String(process.env.SUPPORT_INBOX_ADDRESS || "hello@showfi.io").trim();
  const payload = {
    from: fromAddress,
    to: [toAddress],
    subject,
    text,
    reply_to: requesterEmail || undefined,
    headers: {
      "X-ShowFi-Support-Ticket": String(ticketId || ""),
    },
  };

  if (provider === "resend") {
    return sendViaResend(payload);
  }

  if (provider === "smtp") {
    const smtpConfig = parseJsonIfNeeded(process.env.SMTP_CONFIG_JSON);
    if (!smtpConfig) return { ok: false, error: "Missing SMTP_CONFIG_JSON" };
    return { ok: true, skipped: true, provider: "smtp", detail: "smtp_adapter_placeholder", smtpConfig };
  }

  console.log("[support-mail]", payload);
  return { ok: true, skipped: true, provider: "log" };
}

