// errors.ts
import * as Sentry from "@sentry/nextjs";
import {
  ApiError,
  createErrorReporter,
  type ErrorReporter,
} from "@lavinou/webbysalespro/networking";

/**
 * The error taxonomy and the reporter both live in the shared package now, so
 * this app and the admin console decode and group backend failures identically.
 *
 * This module stays as the import path because ~12 files reference it, and
 * because a single import path means `instanceof ApiError` compares against one
 * class — two copies would silently fail that check.
 *
 * The shared decoder fixes one thing this file used to get wrong: nested
 * serializer errors now flatten with their field path intact
 * (`slides[0].url: Enter a valid URL.`) instead of rendering `[object Object]`.
 */
export {
  ApiError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  safeDecodeErrorPayload,
  fallbackErrorMessage,
} from "@lavinou/webbysalespro/networking";

export type { ApiErrorPayload } from "@lavinou/webbysalespro/networking";

/**
 * Sink for API failures.
 *
 * The shared reporter handles dedup, id-collapsed fingerprints and URL
 * sanitising. It drops the whole query string rather than redacting named
 * params, which covers the `?t=` join token more thoroughly than the old
 * per-param scrub did.
 *
 * Note this changes 401/402/403/404 from captured warnings to breadcrumbs: they
 * are product flow here — an expired link, a paused webinar, a session the
 * refresh path already recovers — and capturing them buried the real failures.
 * They still ride along on whatever gets captured next.
 */
export const report: ErrorReporter = createErrorReporter({
  capture: (error, detail) => Sentry.captureException(error, detail),
  addBreadcrumb: (breadcrumb) => Sentry.addBreadcrumb(breadcrumb),
});

export type ApiErrorCaptureContext = {
  /** Logical name of the call site, used for grouping. */
  operation?: string;
  response?: Response;
};

/** Send an ApiError to the reporter. Safe to call twice — the second is a no-op. */
export function captureApiError(
  error: ApiError,
  context: ApiErrorCaptureContext = {},
): void {
  report(error, {
    url: error.url,
    status: error.status,
    code: error.code,
    scope: "request",
    ...(context.operation ? { extra: { operation: context.operation } } : {}),
  });
}

/** Report each unsuccessful response once, even when several layers inspect it. */
export async function captureApiErrorResponse(
  response: Response,
  context: { operation?: string } = {},
): Promise<void> {
  if (response.ok) return;

  try {
    const error = await ApiError.fromResponse(response);
    captureApiError(error, context);
  } catch {
    // Decoding the body for reporting failed; never let that reach the caller.
  }
}
