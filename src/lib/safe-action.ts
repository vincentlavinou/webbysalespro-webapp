import { createSafeActionClient } from "next-safe-action";
import { ApiError } from "./error";

export type ServerError = {
  detail: string;
  code: string;
  pauseInfo?: unknown;
};

export const actionClient = createSafeActionClient({
  handleServerError(e): ServerError {
    if (e instanceof ApiError) {
      return {
        detail: e.message,
        code: e.code ?? "unknown",
        pauseInfo: e.payload?.pause_info,
      };
    }
    return {
      detail: e instanceof Error ? e.message : "An unexpected error occurred.",
      code: "unknown",
    };
  },
  defaultValidationErrorsShape: "flattened",
});
