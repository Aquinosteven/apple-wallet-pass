function collectErrorMessages(error) {
  const values = [
    error?.message,
    error?.details,
    error?.hint,
    error?.cause?.message,
    error?.cause?.code,
    error?.code,
  ];

  return values
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.toLowerCase());
}

export function isSupabaseUnavailableError(error) {
  const messages = collectErrorMessages(error);
  return messages.some((message) => (
    message.includes("fetch failed")
    || message.includes("failed to fetch")
    || message.includes("load failed")
    || message.includes("enotfound")
    || message.includes("eai_again")
    || message.includes("getaddrinfo")
  ));
}

export function getSupabaseUnavailableMessage() {
  return "Authentication is temporarily unavailable because the Supabase project host could not be reached. Check SUPABASE_URL/VITE_SUPABASE_URL and confirm the project URL is still valid.";
}
