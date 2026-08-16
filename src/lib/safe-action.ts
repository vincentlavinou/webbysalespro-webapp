import { createPlatformActionClient } from "@lavinou/webbysalespro/networking/action";
import { AlreadyRegisteredError } from "@/webinar/service/error";
import { report } from "./error";

/**
 * The shared action client.
 *
 * The package owns the error shape, the dedup against failures the request
 * layer already reported, and the flattened validation-error shape. This app
 * still owns the two things it cannot: where a failure is reported, and which
 * of its own errors are expected outcomes rather than faults.
 *
 * One shape change reaches the client. `ServerError` was
 * `{ detail, code, pauseInfo }` here; it is now
 * `{ detail, code, status?, payload? }`, and the pause notice lives at
 * `payload.pause_info` rather than at the top level. That is not a rename for
 * its own sake — `payload` carries every extra key the backend sent, where
 * `pauseInfo` could only ever carry the one this app had thought to lift out.
 * `status` is new and was previously discarded.
 *
 * Reporting is no longer hand-skipped for `ApiError`. It is skipped for any
 * error the request layer already marked, which is the same set plus anything
 * else a caller reports itself — see `alreadyReported` in ./http.ts.
 */
export const actionClient = createPlatformActionClient({
  report,
  recognize: [
    // A real product outcome, not a fault: it must reach the client with its
    // code intact and must never be reported.
    (error) =>
      error instanceof AlreadyRegisteredError
        ? { detail: error.message, code: error.code }
        : null,
  ],
});

export type { ServerError } from "@lavinou/webbysalespro/networking/action";
