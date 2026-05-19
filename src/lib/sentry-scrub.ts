const SENSITIVE_QUERY_PARAMS = ["t", "join_token", "participant_token"];

export function scrubSensitiveUrl(url: string): string {
  try {
    const parsed = new URL(url);
    let mutated = false;
    for (const param of SENSITIVE_QUERY_PARAMS) {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, "[REDACTED]");
        mutated = true;
      }
    }
    return mutated ? parsed.toString() : url;
  } catch {
    return url;
  }
}

type ScrubbableEvent = {
  request?: { url?: string } | null;
};

export function scrubSentryEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.request?.url) {
    event.request.url = scrubSensitiveUrl(event.request.url);
  }
  return event;
}
