import 'server-only'

import { ApiError, safeDecodeErrorPayload } from '@/lib/error'

const webinarApiUrl =
  process.env.WEBINAR_BASE_API_URL ??
  process.env.NEXT_PUBLIC_WEBINAR_BASE_API_URL ??
  'https://api.webisalespro.com/api'

const webinarAppUrl =
  process.env.WEBINAR_APP_URL ??
  process.env.NEXT_PUBLIC_WEBINAR_APP_URL ??
  process.env.APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'https://events.webisalespro.com'

export type ShortLinkResolution =
  | { status: 'resolved'; url: string }
  | { status: 'expired' }

export async function resolveShortLink(shortCode: string): Promise<ShortLinkResolution> {
  const response = await fetch(
    `${webinarApiUrl}/v2/short-links/${encodeURIComponent(shortCode)}/resolve/`,
    { cache: 'no-store' },
  )

  if (response.ok) {
    const payload: unknown = await response.json()
    const url =
      payload &&
      typeof payload === 'object' &&
      'url' in payload &&
      typeof payload.url === 'string'
        ? payload.url
        : null

    if (!url) {
      throw new Error('Short-link resolve response did not include a URL.')
    }

    return { status: 'resolved', url }
  }

  const { decoded, payload } = await safeDecodeErrorPayload(response)
  if (response.status === 404 && decoded && payload?.code === 'SL-001') {
    return { status: 'expired' }
  }

  throw new ApiError({
    message:
      payload?.detail ??
      `Short-link resolution failed with status ${response.status}.`,
    status: response.status,
    code: payload?.code,
    payload,
    url: response.url,
  })
}

export function extractShortCode(url: string): string | null {
  try {
    const parsed = new URL(url, webinarAppUrl)
    const match = parsed.pathname.match(/^\/l\/([^/]+)\/?$/)
    return match ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}
