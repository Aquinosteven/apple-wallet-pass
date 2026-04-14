function collectMessages(error: unknown): string[] {
  if (!error || typeof error !== 'object') {
    return [];
  }

  const record = error as Record<string, unknown>;
  const cause = typeof record.cause === 'object' && record.cause ? record.cause as Record<string, unknown> : null;
  const candidates = [
    record.message,
    record.code,
    cause?.message,
    cause?.code,
  ];

  return candidates
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.toLowerCase());
}

export function normalizeAuthErrorMessage(error: unknown, fallback: string): string {
  const messages = collectMessages(error);
  const isUnavailable = messages.some((message) => (
    message.includes('failed to fetch')
    || message.includes('fetch failed')
    || message.includes('load failed')
    || message.includes('enotfound')
    || message.includes('eai_again')
    || message.includes('getaddrinfo')
  ));

  if (isUnavailable) {
    return 'Authentication is temporarily unavailable because the Supabase project host could not be reached. Check VITE_SUPABASE_URL and your network/DNS settings.';
  }

  return fallback;
}
