import { createSafeActionClient } from "next-safe-action";
import { ApiError } from "./error";

export type ServerError = {
  detail: string;
  code: string;
};

export const actionClient = createSafeActionClient({
  handleServerError(e): ServerError {
    if (e instanceof ApiError) {
      return {
        detail: e.message,
        code: e.code ?? "unknown",
      };
    }
    return {
      detail: e instanceof Error ? e.message : "An unexpected error occurred.",
      code: "unknown",
    };
  },
  defaultValidationErrorsShape: "flattened",
});
