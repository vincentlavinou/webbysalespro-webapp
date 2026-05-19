// http.ts
import {
  ApiError,
  NotFoundError,
  UnauthorizedError,
  fallbackErrorMessage,
  safeDecodeErrorPayload,
} from "./error";

export async function handleStatus(response: Response): Promise<Response> {
  if (response.ok) return response;

  const { payload, decoded } = await safeDecodeErrorPayload(response);

  if (response.status === 401 || response.status === 403) {
    if (decoded && payload) {
      throw new UnauthorizedError(payload.detail, payload.code ?? "unauthorized");
    }
    throw new UnauthorizedError();
  }

  if (response.status === 404) {
    if (decoded && payload) throw new NotFoundError(payload.detail);
    throw new NotFoundError();
  }

  if (decoded && payload) {
    throw new ApiError({
      message: payload.detail,
      status: response.status,
      code: payload.code,
      payload,
      url: response.url,
    });
  }

  const message = await fallbackErrorMessage(response);
  throw new ApiError({
    message,
    status: response.status,
    url: response.url,
    payload: { detail: message, code: "CLT-001" },
  });
}
