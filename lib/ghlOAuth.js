const GHL_API_BASE_URL = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";
const GHL_OAUTH_AUTHORIZE_URL = "https://marketplace.gohighlevel.com/oauth/chooselocation";
const DEFAULT_OAUTH_SCOPES = [
  "contacts.readonly",
  "contacts.write",
  "locations.readonly",
  "locations/customFields.readonly",
  "locations/customFields.write",
];
const TOKEN_REFRESH_SKEW_MS = 60 * 1000;

function normalizeText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function coerceOptionalId(value) {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || "";
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function parseScopes(scopeValue) {
  if (!scopeValue) return [];
  if (Array.isArray(scopeValue)) {
    return scopeValue
      .map((value) => normalizeText(typeof value === "string" ? value : String(value || "")))
      .filter(Boolean);
  }
  if (typeof scopeValue === "string") {
    return scopeValue
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [];
}

function getOauthScopes() {
  const configured = parseScopes(process.env.GHL_OAUTH_SCOPES);
  if (configured.length > 0) return configured;
  return [...DEFAULT_OAUTH_SCOPES];
}

function getOauthConfig() {
  return {
    clientId: normalizeText(process.env.GHL_OAUTH_CLIENT_ID || ""),
    clientSecret: normalizeText(process.env.GHL_OAUTH_CLIENT_SECRET || ""),
    redirectUri: normalizeText(process.env.GHL_OAUTH_REDIRECT_URI || ""),
    scopes: getOauthScopes(),
    userType: normalizeText(process.env.GHL_OAUTH_USER_TYPE || "Location"),
  };
}

export function getMissingOauthConfigKeys() {
  const config = getOauthConfig();
  const missing = [];
  if (!config.clientId) missing.push("GHL_OAUTH_CLIENT_ID");
  if (!config.clientSecret) missing.push("GHL_OAUTH_CLIENT_SECRET");
  if (!config.redirectUri) missing.push("GHL_OAUTH_REDIRECT_URI");
  return missing;
}

export function buildGhlOauthAuthorizeUrl(state) {
  const config = getOauthConfig();
  const params = new URLSearchParams({
    response_type: "code",
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    state: normalizeText(state),
  });
  if (config.scopes.length > 0) {
    params.set("scope", config.scopes.join(" "));
  }
  return `${GHL_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

function getFetchImpl(fetchImpl) {
  return fetchImpl || globalThis.fetch?.bind(globalThis);
}

function parseTokenResponse(payload) {
  const accessToken = normalizeText(payload?.access_token);
  const refreshToken = normalizeText(payload?.refresh_token);
  const expiresInSeconds = Number(payload?.expires_in);
  const locationId = coerceOptionalId(payload?.locationId) || coerceOptionalId(payload?.companyId);
  const companyId = coerceOptionalId(payload?.companyId);
  const agencyId = coerceOptionalId(payload?.agencyId);
  const scopes = parseScopes(payload?.scope);

  if (!accessToken || !refreshToken || !locationId) {
    return null;
  }

  const ttlMs = Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
    ? expiresInSeconds * 1000
    : 24 * 60 * 60 * 1000;

  return {
    accessToken,
    refreshToken,
    locationId,
    companyId,
    agencyId,
    scopes,
    tokenExpiresAt: new Date(Date.now() + ttlMs).toISOString(),
  };
}

async function requestOauthToken(fetchImpl, bodyParams) {
  const fetcher = getFetchImpl(fetchImpl);
  if (!fetcher) throw new Error("Fetch is not available");

  const response = await fetcher(`${GHL_API_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(bodyParams).toString(),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = normalizeText(payload?.message)
      || normalizeText(payload?.error_description)
      || normalizeText(payload?.error)
      || `OAuth token request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const parsed = parseTokenResponse(payload);
  if (!parsed) {
    throw new Error("OAuth token response missing required fields");
  }
  return parsed;
}

export async function exchangeOauthCodeForTokens({ code, fetchImpl }) {
  const config = getOauthConfig();
  const bodyParams = {
    grant_type: "authorization_code",
    code: normalizeText(code),
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    user_type: config.userType,
  };
  return requestOauthToken(fetchImpl, bodyParams);
}

export async function refreshOauthTokens({ refreshToken, fetchImpl }) {
  const config = getOauthConfig();
  const bodyParams = {
    grant_type: "refresh_token",
    refresh_token: normalizeText(refreshToken),
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    user_type: config.userType,
  };
  return requestOauthToken(fetchImpl, bodyParams);
}

export async function saveOauthState(supabase, state, returnTo = "") {
  const payload = {
    state: normalizeText(state),
    return_to: normalizeText(returnTo) || null,
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("ghl_oauth_states")
    .insert(payload);
  if (error) throw new Error(error.message || "Failed to store OAuth state");
}

export async function consumeOauthState(supabase, state) {
  const normalized = normalizeText(state);
  const { data, error } = await supabase
    .from("ghl_oauth_states")
    .delete()
    .eq("state", normalized)
    .select("state,return_to,created_at")
    .maybeSingle();
  if (error) throw new Error(error.message || "Failed to validate OAuth state");
  return data || null;
}

export async function upsertGhlInstallation(supabase, installation) {
  const payload = {
    location_id: installation.locationId,
    company_id: installation.companyId || null,
    agency_id: installation.agencyId || null,
    access_token: installation.accessToken,
    refresh_token: installation.refreshToken,
    token_expires_at: installation.tokenExpiresAt,
    scopes: installation.scopes || [],
    installed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("ghl_installations")
    .upsert(payload, { onConflict: "location_id" })
    .select("id,location_id,company_id,agency_id,access_token,refresh_token,token_expires_at,scopes,installed_at,updated_at")
    .single();

  if (error) throw new Error(error.message || "Failed to save GHL installation");
  return data;
}

export async function getInstallationByLocationId(supabase, locationId) {
  const normalized = normalizeText(locationId);
  if (!normalized) return null;

  const { data, error } = await supabase
    .from("ghl_installations")
    .select("id,location_id,company_id,agency_id,access_token,refresh_token,token_expires_at,scopes,installed_at,updated_at")
    .eq("location_id", normalized)
    .maybeSingle();

  if (error) throw new Error(error.message || "Failed to load GHL installation");
  return data || null;
}

function shouldRefreshToken(tokenExpiresAtIso) {
  const parsed = new Date(tokenExpiresAtIso || "");
  if (Number.isNaN(parsed.getTime())) return true;
  return parsed.getTime() <= (Date.now() + TOKEN_REFRESH_SKEW_MS);
}

export async function ensureValidAccessTokenForLocation({ supabase, locationId, fetchImpl }) {
  const installation = await getInstallationByLocationId(supabase, locationId);
  if (!installation) return null;

  if (!shouldRefreshToken(installation.token_expires_at)) {
    return installation;
  }

  const refreshed = await refreshOauthTokens({
    refreshToken: installation.refresh_token,
    fetchImpl,
  });
  const updated = await upsertGhlInstallation(supabase, refreshed);
  return updated;
}

function readCustomFieldList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.customFields)) return payload.customFields;
  if (Array.isArray(payload?.data?.customFields)) return payload.data.customFields;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function normalizeCustomFieldKey(customField) {
  return normalizeText(customField?.fieldKey)
    || normalizeText(customField?.key)
    || normalizeText(customField?.name);
}

function matchesCustomField(customField, fieldKey) {
  const normalizedTarget = normalizeText(fieldKey).toLowerCase();
  if (!normalizedTarget) return false;
  const normalized = normalizeCustomFieldKey(customField).toLowerCase();
  return normalized === normalizedTarget
    || normalized === normalizedTarget.replace(/^contact\./, "")
    || `contact.${normalized}` === normalizedTarget;
}

async function fetchLocationCustomFields({ fetchImpl, accessToken, locationId }) {
  const fetcher = getFetchImpl(fetchImpl);
  const response = await fetcher(`${GHL_API_BASE_URL}/locations/${encodeURIComponent(locationId)}/customFields`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Version: GHL_API_VERSION,
      Accept: "application/json",
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(`Custom fields lookup failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return readCustomFieldList(payload);
}

async function createLocationCustomField({ fetchImpl, accessToken, locationId, fieldName }) {
  const fetcher = getFetchImpl(fetchImpl);
  const response = await fetcher(`${GHL_API_BASE_URL}/locations/${encodeURIComponent(locationId)}/customFields`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Version: GHL_API_VERSION,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: fieldName,
      dataType: "TEXT",
      model: "contact",
    }),
  });

  if (!response.ok) {
    const error = new Error(`Custom field create failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }
}

export async function ensureShowfiContactCustomFields({ fetchImpl, accessToken, locationId, onError }) {
  if (!accessToken || !locationId) return { ok: false, attempted: false, missing: [] };

  const required = [
    { fieldName: "showfi_claim_url", fieldKey: "contact.showfi_claim_url" },
    { fieldName: "showfi_claim_token", fieldKey: "contact.showfi_claim_token" },
    { fieldName: "showfi_pass_issued_at", fieldKey: "contact.showfi_pass_issued_at" },
    { fieldName: "showfi_wallet_added_at", fieldKey: "contact.showfi_wallet_added_at" },
    { fieldName: "showfi_join_click_first_at", fieldKey: "contact.showfi_join_click_first_at" },
    { fieldName: "showfi_join_click_latest_at", fieldKey: "contact.showfi_join_click_latest_at" },
    { fieldName: "showfi_join_click_count", fieldKey: "contact.showfi_join_click_count" },
  ];

  try {
    const existing = await fetchLocationCustomFields({ fetchImpl, accessToken, locationId });
    const missing = [];
    for (const field of required) {
      const exists = existing.some((item) => matchesCustomField(item, field.fieldKey));
      if (!exists) {
        missing.push(field.fieldKey);
        try {
          await createLocationCustomField({
            fetchImpl,
            accessToken,
            locationId,
            fieldName: field.fieldName,
          });
        } catch (error) {
          if (typeof onError === "function") {
            onError(error, {
              phase: "create_custom_field",
              fieldKey: field.fieldKey,
              locationId,
            });
          }
        }
      }
    }

    return { ok: true, attempted: true, missing };
  } catch (error) {
    if (typeof onError === "function") {
      onError(error, {
        phase: "list_custom_fields",
        locationId,
      });
    }
    return { ok: false, attempted: true, missing: required.map((field) => field.fieldKey) };
  }
}

export async function updateGhlContactCustomFields({
  fetchImpl,
  accessToken,
  contactId,
  locationId,
  claimUrl,
  claimToken,
  passIssuedAt,
  walletAddedAt,
  joinClickFirstAt,
  joinClickLatestAt,
  joinClickCount,
}) {
  const fetcher = getFetchImpl(fetchImpl);
  if (!fetcher || !accessToken || !contactId || !locationId) {
    return { attempted: false, ok: false };
  }

  try {
    const response = await fetcher(`${GHL_API_BASE_URL}/contacts/${encodeURIComponent(contactId)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Version: GHL_API_VERSION,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locationId,
        customFields: [
          { key: "contact.showfi_claim_url", field_value: claimUrl },
          { key: "contact.showfi_claim_token", field_value: claimToken },
          { key: "contact.showfi_pass_issued_at", field_value: passIssuedAt || "" },
          { key: "contact.showfi_wallet_added_at", field_value: walletAddedAt || "" },
          { key: "contact.showfi_join_click_first_at", field_value: joinClickFirstAt || "" },
          { key: "contact.showfi_join_click_latest_at", field_value: joinClickLatestAt || "" },
          { key: "contact.showfi_join_click_count", field_value: joinClickCount == null ? "" : String(joinClickCount) },
        ],
      }),
    });

    return {
      attempted: true,
      ok: response.ok,
      status: Number.isFinite(response.status) ? response.status : undefined,
    };
  } catch {
    return { attempted: true, ok: false };
  }
}
