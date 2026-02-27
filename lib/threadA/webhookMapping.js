function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function toPathArray(path) {
  if (Array.isArray(path)) return path.map((part) => String(part));
  const text = normalizeText(path);
  if (!text) return [];
  return text.split(".").map((part) => part.trim()).filter(Boolean);
}

function getPathValue(payload, path) {
  const parts = toPathArray(path);
  if (!parts.length) return "";

  let current = payload;
  for (const part of parts) {
    if (current == null) return "";
    if (Array.isArray(current)) {
      const index = Number(part);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) return "";
      current = current[index];
      continue;
    }
    if (typeof current !== "object") return "";
    current = current[part];
  }

  if (current == null) return "";
  if (typeof current === "string" || typeof current === "number") return String(current).trim();
  return "";
}

export const WEBHOOK_MAPPING_PRESETS = {
  ghl: {
    sourceType: "ghl",
    fields: {
      name: ["contact.name", "contact.fullName", "name"],
      email: ["contact.email", "email"],
      phone: ["contact.phone", "phone"],
      joinLink: ["customData.joinLink", "contact.customData.joinLink", "joinLink"],
      tier: ["customData.tier", "contact.customData.tier", "customData.gaVip", "contact.customData.gaVip", "tier", "gaVip"],
      crmContactId: ["contact.id", "contactId"],
    },
  },
  clickfunnels: {
    sourceType: "clickfunnels",
    fields: {
      name: ["contact.name", "name", "full_name"],
      email: ["contact.email", "email"],
      phone: ["contact.phone", "phone"],
      joinLink: ["custom_fields.join_link", "join_link", "joinLink"],
      tier: ["custom_fields.tier", "custom_fields.ga_vip", "tier", "gaVip"],
      crmContactId: ["contact.id", "contact_id", "id"],
    },
  },
  generic: {
    sourceType: "generic",
    fields: {
      name: ["name"],
      email: ["email"],
      phone: ["phone"],
      joinLink: ["joinLink", "join_link"],
      tier: ["tier", "gaVip", "ga_vip"],
      crmContactId: ["crmContactId", "contactId", "contact_id"],
    },
  },
  zapier: {
    sourceType: "zapier",
    fields: {
      name: ["name", "full_name"],
      email: ["email"],
      phone: ["phone"],
      joinLink: ["joinLink", "join_link"],
      tier: ["tier", "gaVip"],
      crmContactId: ["contact_id", "contactId"],
    },
  },
};

export const REQUIRED_MAPPED_FIELDS = ["name", "email", "phone", "joinLink", "tier"];

export function buildMappingConfig({ preset = "generic", fieldPaths = null } = {}) {
  const base = WEBHOOK_MAPPING_PRESETS[preset] || WEBHOOK_MAPPING_PRESETS.generic;
  const resolved = {};

  for (const [field, paths] of Object.entries(base.fields)) {
    if (fieldPaths && Array.isArray(fieldPaths[field]) && fieldPaths[field].length > 0) {
      resolved[field] = fieldPaths[field].map((path) => String(path));
      continue;
    }
    if (fieldPaths && typeof fieldPaths[field] === "string" && fieldPaths[field].trim()) {
      resolved[field] = [fieldPaths[field].trim()];
      continue;
    }
    resolved[field] = paths.slice();
  }

  return {
    preset: base.sourceType,
    fields: resolved,
  };
}

function pickFirstMappedValue(payload, paths) {
  for (const path of paths || []) {
    const found = getPathValue(payload, path);
    if (found) return found;
  }
  return "";
}

function normalizeTier(value) {
  const normalized = normalizeText(value).toUpperCase();
  if (!normalized) return "GA";
  if (normalized === "VIP" || normalized === "V.I.P") return "VIP";
  if (normalized === "GA" || normalized === "GENERAL" || normalized === "GENERAL ADMISSION") return "GA";
  return normalized === "1" ? "VIP" : "GA";
}

export function normalizeWebhookPayload(payload, mappingConfig) {
  const map = mappingConfig || buildMappingConfig({ preset: "generic" });

  const normalized = {
    name: pickFirstMappedValue(payload, map.fields.name),
    email: pickFirstMappedValue(payload, map.fields.email).toLowerCase(),
    phone: pickFirstMappedValue(payload, map.fields.phone),
    joinLink: pickFirstMappedValue(payload, map.fields.joinLink),
    tier: normalizeTier(pickFirstMappedValue(payload, map.fields.tier)),
    crmContactId: pickFirstMappedValue(payload, map.fields.crmContactId),
  };

  const missing = REQUIRED_MAPPED_FIELDS.filter((field) => !normalizeText(normalized[field]));
  const errors = [];
  if (!normalized.joinLink) {
    errors.push("joinLink is required from source data");
  } else {
    try {
      const url = new URL(normalized.joinLink);
      if (!(url.protocol === "https:" || url.protocol === "http:")) {
        errors.push("joinLink must be a valid HTTP(S) URL");
      }
    } catch {
      errors.push("joinLink must be a valid HTTP(S) URL");
    }
  }

  if (normalized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
    errors.push("email must be valid");
  }

  if (missing.length > 0) {
    errors.push(`missing required mapped fields: ${missing.join(", ")}`);
  }

  return {
    ok: errors.length === 0,
    normalized,
    missing,
    errors,
  };
}
