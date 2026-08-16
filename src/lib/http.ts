// http.ts
import { markReported } from "@lavinou/webbysalespro/networking";
import {
  ApiError,
  NotFoundError,
  UnauthorizedError,
  fallbackErrorMessage,
  safeDecodeErrorPayload,
  captureApiErrorResponse,
} from "./error";

/**
 * Marks a thrown error as already sent to monitoring.
 *
 * `captureApiErrorResponse` reports a failure built *from the response*, so the
 * object it reports is not the object thrown below. The shared reporter dedupes
 * on object identity, so without this the action boundary's
 * `handleServerError` sees an unreported error and files a second, less
 * informative issue for the same upstream failure — one with no status, method
 * or endpoint attached.
 *
 * The console avoids this by construction: its `handleStatus` builds one error,
 * reports that object, and throws it. Doing the same here would mean decoding
 * the body once instead of twice, and is the better shape — but it changes
 * which error class each status produces, so it is left alone for now.
 */
function alreadyReported<E>(error: E): E {
  markReported(error);
  return error;
}

export async function handleStatus(response: Response): Promise<Response> {
  if (response.ok) return response;

  await captureApiErrorResponse(response);

  const { payload, decoded } = await safeDecodeErrorPayload(response);

  if (response.status === 401 || response.status === 403) {
    if (decoded && payload) {
      throw alreadyReported(
        new UnauthorizedError(payload.detail, payload.code ?? "unauthorized"),
      );
    }
    throw alreadyReported(new UnauthorizedError());
  }

  if (response.status === 404) {
    if (decoded && payload?.code === "WEB-PAUSED") {
      throw alreadyReported(
        new ApiError({
          message: payload.detail,
          status: response.status,
          code: payload.code,
          payload,
          url: response.url,
        }),
      );
    }
    if (decoded && payload) throw alreadyReported(new NotFoundError(payload.detail));
    throw alreadyReported(new NotFoundError());
  }

  if (decoded && payload) {
    throw alreadyReported(
      new ApiError({
        message: payload.detail,
        status: response.status,
        code: payload.code,
        payload,
        url: response.url,
      }),
    );
  }

  const message = await fallbackErrorMessage(response);
  throw alreadyReported(
    new ApiError({
      message,
      status: response.status,
      url: response.url,
      payload: { detail: message, code: "CLT-001" },
    }),
  );
}
