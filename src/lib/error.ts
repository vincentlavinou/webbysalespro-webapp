// errors.ts
import * as Sentry from "@sentry/nextjs";
import { scrubSensitiveUrl } from "./sentry-scrub";

export interface ApiErrorPayload {
  detail: string;
  code?: string;
  [key: string]: unknown;
}

export class ApiError extends Error {
  public status: number;
  public code?: string;
  public payload?: ApiErrorPayload;
  public url?: string;
  /** Set once this error has been sent to Sentry, so outer handlers don't duplicate it. */
  public reported = false;

  constructor(init: {
    message: string;
    status: number;
    code?: string;
    payload?: ApiErrorPayload;
    url?: string;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.payload = init.payload;
    this.url = init.url;
  }

  static async fromResponse(res: Response): Promise<ApiError> {
    const url = res.url;
    const { payload, decoded } = await safeDecodeErrorPayload(res);

    if (decoded && payload) {
      return new ApiError({
        message: payload.detail,
        status: res.status,
        code: payload.code,
        payload,
        url,
      });
    }

    const message = await fallbackErrorMessage(res);
    return new ApiError({
      message,
      status: res.status,
      url,
      payload: { detail: message, code: "CLT-001" },
    });
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized access. Please log in again.", code = "unauthorized") {
    super({ message, status: 401, code });
    this.name = "UnauthorizedError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Not found") {
    super({ message, status: 404, code: "not_found" });
    this.name = "NotFoundError";
  }
}

const reportedApiResponses = new WeakSet<Response>();

export type ApiErrorCaptureContext = {
  /** Logical name of the call site, used for tagging and grouping. */
  operation?: string;
  /** The response the error came from, deduped so multiple layers report it once. */
  response?: Response;
};

/**
 * Collapse a URL into a stable grouping key: origin dropped, ids replaced with
 * `:id`, query string dropped. Keeps Sentry from opening a new issue per webinar.
 */
function fingerprintPath(url: string | undefined): string {
  if (!url) return "unknown";
  try {
    const { pathname } = new URL(url);
    return pathname
      .split("/")
      .map((segment) =>
        /^[0-9]+$/.test(segment) ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
        (segment.length >= 16 && !segment.includes("."))
          ? ":id"
          : segment,
      )
      .join("/");
  } catch {
    return "unknown";
  }
}

/**
 * Send an ApiError to Sentry exactly once.
 *
 * 5xx is a real outage and reports at `error`; 4xx is usually a client/business
 * condition and reports at `warning` so it stays searchable without paging.
 * Events group by call site + status + code rather than by message, which would
 * otherwise fan out one issue per interpolated id.
 */
export function captureApiError(error: ApiError, context: ApiErrorCaptureContext = {}): void {
  const { operation, response } = context;

  if (error.reported) return;
  error.reported = true;

  if (response) {
    if (reportedApiResponses.has(response)) return;
    reportedApiResponses.add(response);
  }

  const groupKey = operation ?? fingerprintPath(error.url);
  // `url` can carry a join token in `?t=`; the global scrubber only covers
  // `event.request.url`, so redact before it becomes event data.
  const safeUrl = error.url ? scrubSensitiveUrl(error.url) : undefined;

  // Reporting must never break the path it observes: a throw here would replace
  // the typed ApiError that callers branch on (code, pause_info) with a transport
  // or serialization failure.
  try {
    Sentry.captureException(error, {
      level: error.status >= 500 ? "error" : "warning",
      tags: {
        error_type: "api_error",
        api_status: String(error.status),
        ...(error.code ? { api_code: error.code } : {}),
        ...(operation ? { operation } : {}),
      },
      extra: {
        status: error.status,
        url: safeUrl,
        detail: error.message,
        payload: error.payload,
      },
      fingerprint: ["api_error", groupKey, String(error.status), error.code ?? "none"],
    });
  } catch {
    // Swallow — an unreported error is strictly better than a broken response path.
  }
}

/** Report each unsuccessful API response once, even when multiple layers inspect it. */
export async function captureApiErrorResponse(
  response: Response,
  context: { operation?: string } = {},
): Promise<void> {
  if (response.ok || reportedApiResponses.has(response)) return;

  try {
    const error = await ApiError.fromResponse(response);
    captureApiError(error, { operation: context.operation, response });
  } catch {
    // Decoding the body for reporting failed; never let that surface to the caller.
  }
}

const TRANSIENT_FALLBACK_MESSAGE =
  "Service temporarily unavailable. Please try again in a moment.";

export async function fallbackErrorMessage(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";
  if (res.status >= 500 || contentType.includes("text/html")) {
    return TRANSIENT_FALLBACK_MESSAGE;
  }

  const text = await res.clone().text().catch(() => "");
  return (
    text?.trim() ||
    res.statusText ||
    `Request failed with status ${res.status}`
  );
}

/**
 * Tries to read `{ detail, code }` from the response.
 * Returns `{ decoded: true, payload }` when successful, else `{ decoded: false }`.
 */
export async function safeDecodeErrorPayload(
  res: Response
): Promise<{ decoded: boolean; payload?: ApiErrorPayload }> {
  const ct = res.headers.get("content-type") ?? "";

  // If not JSON, bail early
  if (!ct.includes("application/json")) {
    return { decoded: false };
  }

  // Try JSON parse; handle non-standard shapes (e.g., DRF field errors)
  try {
    const json = await res.clone().json();

    // Standard shape
    if (json && typeof json.detail === "string") {
      const payload: ApiErrorPayload = {
        ...json,
        detail: json.detail,
        code: typeof json.code === "string" ? json.code : undefined,
      };
 
      return { decoded: true, payload };
    }

    // Common DRF shape: { field: ["msg"], field2: ["msg2"] }
    if (json && typeof json === "object") {
      const parts: string[] = [];
      for (const [k, v] of Object.entries(json)) {
        if (Array.isArray(v)) {
          parts.push(`${k}: ${v.join(", ")}`);
        } else if (typeof v === "string") {
          parts.push(`${k}: ${v}`);
        }
      }
      if (parts.length) {
        return {
          decoded: true,
          payload: { detail: parts.join(" | ") },
        };
      }
    }
  } catch {
    // fall through
  }

  return { decoded: false };
}
