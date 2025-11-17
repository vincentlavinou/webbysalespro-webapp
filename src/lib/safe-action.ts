import { createSafeActionClient } from "next-safe-action";

export const actionClient = createSafeActionClient({
  // Can also be an async function.
  handleServerError(e) {
    return e.message
  },
  defaultValidationErrorsShape: "flattened"
});