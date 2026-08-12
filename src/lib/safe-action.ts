import { createSafeActionClient } from "next-safe-action";
import { ApiError } from "./error";
import { AlreadyRegisteredError } from "@/webinar/service/error";
import * as Sentry from "@sentry/nextjs";

export type ServerError = {
  detail: string;
  code: string;
  pauseInfo?: unknown;
};

export const actionClient = createSafeActionClient({
  handleServerError(e): ServerError {
    // An ApiError only ever originates from a non-2xx response, and every path
    // that builds one reports it to Sentry first. Capturing again here would
    // file a second issue for the same upstream failure.
    if (e instanceof ApiError) {
      return {
        detail: e.message,
        code: e.code ?? "unknown",
        pauseInfo: e.payload?.pause_info,
      };
    }

    // Expected product outcome, not a fault.
    if (e instanceof AlreadyRegisteredError) {
      return { detail: e.message, code: e.code };
    }

    // Anything else is an unexpected server-side failure nothing upstream saw.
    Sentry.captureException(e, { tags: { error_type: "action_error" } });
    return {
      detail: e instanceof Error ? e.message : "An unexpected error occurred.",
      code: "unknown",
    };
  },
  defaultValidationErrorsShape: "flattened",
});
