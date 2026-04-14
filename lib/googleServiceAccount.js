function isWrapped(value) {
  return value.length >= 2 && (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  );
}

function stripOuterQuotes(value) {
  let current = String(value || "").trim();
  while (isWrapped(current)) {
    current = current.slice(1, -1).trim();
  }
  return current;
}

function normalizeEscapedWhitespaceOutsideStrings(value) {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const next = value[index + 1];

    if (!inString && char === "\\" && next) {
      if (next === "n") {
        result += "\n";
        index += 1;
        continue;
      }
      if (next === "r") {
        result += "\r";
        index += 1;
        continue;
      }
      if (next === "t") {
        result += "\t";
        index += 1;
        continue;
      }
    }

    result += char;

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    }
  }

  return result;
}

function parseJsonCandidate(candidate) {
  const parsed = JSON.parse(candidate);
  if (typeof parsed === "string") {
    return parseJsonCandidate(parsed);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Expected service account object");
  }
  return parsed;
}

export function parseGoogleServiceAccount(rawValue, envName = "GOOGLE_WALLET_SERVICE_ACCOUNT_JSON") {
  const trimmed = String(rawValue || "").trim();
  if (!trimmed) {
    throw new Error(`Missing ${envName}`);
  }

  const candidates = [];
  const seen = new Set();
  const pushCandidate = (value) => {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push(normalized);
  };

  pushCandidate(trimmed);

  const unwrapped = stripOuterQuotes(trimmed);
  if (unwrapped !== trimmed) {
    pushCandidate(unwrapped);
    pushCandidate(normalizeEscapedWhitespaceOutsideStrings(unwrapped));
  }

  pushCandidate(normalizeEscapedWhitespaceOutsideStrings(trimmed));

  for (const candidate of candidates) {
    try {
      return parseJsonCandidate(candidate);
    } catch {
      // Continue through recovery attempts.
    }
  }

  throw new Error(`Invalid ${envName}`);
}
