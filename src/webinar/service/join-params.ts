const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
const JOIN_TOKEN_PREFIX_PATTERN = /^[A-Za-z0-9._~+/=-]+/;

export function sanitizeWebinarId(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const match = normalized.match(UUID_PATTERN);
  return match?.[0] ?? null;
}

export function sanitizeJoinToken(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const match = normalized.match(JOIN_TOKEN_PREFIX_PATTERN);
  return match?.[0] ?? null;
}
