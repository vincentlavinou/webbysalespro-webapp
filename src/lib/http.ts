// http.ts
import { ApiError, NotFoundError, UnauthorizedError, safeDecodeErrorPayload } from "./error";

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

  // 400, 409, 422, 429, 5xx — build a rich ApiError from the parsed body
  if (decoded && payload) {
    throw new ApiError({
      message: payload.detail,
      status: response.status,
      code: payload.code,
      payload,
      url: response.url,
    });
  }

  const text = await response.clone().text().catch(() => "");
  throw new ApiError({
    message: text?.trim() || response.statusText || `Request failed with status ${response.status}`,
    status: response.status,
    url: response.url,
    payload: { detail: text || "unknown error", code: "CLT-001" },
  });
}
