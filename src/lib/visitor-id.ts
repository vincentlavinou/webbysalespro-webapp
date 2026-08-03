"use client";

export const VISITOR_ID_COOKIE = "visitor_id";
const VISITOR_ID_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2;

function readCookie(name: string): string | null {
  const prefix = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

export function getOrCreateVisitorId(): string {
  const existing = readCookie(VISITOR_ID_COOKIE);
  if (existing) return existing;

  const visitorId = crypto.randomUUID();
  document.cookie = `${encodeURIComponent(VISITOR_ID_COOKIE)}=${encodeURIComponent(visitorId)}; Max-Age=${VISITOR_ID_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
  return visitorId;
}

export function getVisitorId(): string | null {
  return readCookie(VISITOR_ID_COOKIE);
}
