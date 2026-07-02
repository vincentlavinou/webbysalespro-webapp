// errors.ts
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
