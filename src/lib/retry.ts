const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_INITIAL_DELAY_MS = 300;
const DEFAULT_MAX_DELAY_MS = 2_000;
const JITTER_RATIO = 0.3;
const MAX_RETRY_AFTER_MS = 10_000;

type RetryTransientRequestOptions = {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  // HTTP method of the wrapped request. Used by the default retry policy to
  // decide whether 429 is safe to retry (only safe methods are retried on 429).
  method?: string;
  shouldRetryResponse?: (response: Response) => boolean;
  shouldRetryError?: (error: unknown) => boolean;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSafeMethod(method: string | undefined) {
  // fetch defaults to GET when no method is passed.
  if (!method) return true;
  const upper = method.toUpperCase();
  return upper === "GET" || upper === "HEAD";
}

function makeDefaultShouldRetryResponse(method: string | undefined) {
  return (response: Response) => {
    if (response.status >= 500) return true;
    if (response.status === 408) return true;
    if (response.status === 429) return isSafeMethod(method);
    return false;
  };
}

function defaultShouldRetryError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return false;
  }
  return true;
}

function applyJitter(ms: number) {
  const spread = ms * JITTER_RATIO;
  return ms - spread + Math.random() * spread * 2;
}

function parseRetryAfterMs(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (!header) return null;

  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  }

  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) {
    const diff = dateMs - Date.now();
    if (diff > 0) return Math.min(diff, MAX_RETRY_AFTER_MS);
  }

  return null;
}

export async function retryTransientRequest(
  request: () => Promise<Response>,
  options: RetryTransientRequestOptions = {},
): Promise<Response> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const shouldRetryResponse =
    options.shouldRetryResponse ?? makeDefaultShouldRetryResponse(options.method);
  const shouldRetryError = options.shouldRetryError ?? defaultShouldRetryError;

  let attempt = 0;
  let lastError: unknown;
  let nextDelayOverrideMs: number | null = null;

  while (attempt < maxAttempts) {
    attempt += 1;

    try {
      const response = await request();

      if (attempt >= maxAttempts || !shouldRetryResponse(response)) {
        return response;
      }

      nextDelayOverrideMs = parseRetryAfterMs(response);
      await response.body?.cancel().catch(() => {});
    } catch (error) {
      lastError = error;

      if (attempt >= maxAttempts || !shouldRetryError(error)) {
        throw error;
      }
    }

    const backoff = Math.min(
      initialDelayMs * Math.pow(2, attempt - 1),
      maxDelayMs,
    );
    const finalDelay = nextDelayOverrideMs != null
      ? nextDelayOverrideMs + Math.random() * nextDelayOverrideMs * JITTER_RATIO
      : applyJitter(backoff);
    nextDelayOverrideMs = null;

    await delay(finalDelay);
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("Retry request failed without a final response.");
}
