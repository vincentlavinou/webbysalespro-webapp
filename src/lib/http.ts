// http.ts
import { ApiError, NotFoundError, UnauthorizedError, safeDecodeErrorPayload } from "./error";

export async function handleStatus(response: Response): Promise<Response> {
  if (response.ok) return response;

  // Map specific statuses first
  if (response.status === 401 || response.status === 403) {
    throw new UnauthorizedError();
  }
  if (response.status === 404) {
    // Try to get a nicer message, else fallback "Not found"
    try {
      const { payload, decoded } = await safeDecodeErrorPayload(response);
      if (decoded && payload) throw new NotFoundError(payload.detail);
    } catch {
      /* ignore decode failures */
    }
    throw new NotFoundError();
  }

  // For everything else (400, 409, 422, 429, 5xx…), build a rich ApiError

  const result = await ApiError.fromResponse(response);
  throw result
}
