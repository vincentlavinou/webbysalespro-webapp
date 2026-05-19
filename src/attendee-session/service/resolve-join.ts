import "server-only";

import { createHash } from "node:crypto";

import * as Sentry from "@sentry/nextjs";
import { retryTransientRequest } from "@/lib/retry";

import type { JoinResolveResponse } from "./type";

const webinarApiUrl =
  process.env.WEBINAR_BASE_API_URL ??
  process.env.NEXT_PUBLIC_WEBINAR_BASE_API_URL ??
  "https://api.webisalespro.com/api";

const JOIN_RESOLVE_CACHE_TTL_MS = 15_000;
const JOIN_RESOLVE_DEBUG_LOGS = process.env.JOIN_RESOLVE_DEBUG_LOGS === "1";

type JoinResolveCacheEntry = {
  expiresAt: number;
  promise: Promise<JoinResolveResponse | null>;
};

const joinResolveCache = new Map<string, JoinResolveCacheEntry>();
const joinResolveCallCounts = new Map<string, number>();
const joinResolveNetworkCounts = new Map<string, number>();

function hashJoinToken(rawJoinToken: string) {
  return createHash("sha256").update(rawJoinToken).digest("hex").slice(0, 12);
}

function incrementCounter(counter: Map<string, number>, key: string) {
  const nextCount = (counter.get(key) ?? 0) + 1;
  counter.set(key, nextCount);
  return nextCount;
}

function pruneExpiredEntries(now: number) {
  for (const [token, entry] of joinResolveCache.entries()) {
    if (entry.expiresAt <= now) {
      joinResolveCache.delete(token);
    }
  }
}

function logJoinResolveEvent(
  event: string,
  tokenHash: string,
  details: Record<string, string | number | boolean | null | undefined> = {},
) {
  if (!JOIN_RESOLVE_DEBUG_LOGS) {
    return;
  }

  console.info("[join-resolve]", {
    event,
    tokenHash,
    ...details,
  });
}

async function fetchJoinResolve(rawJoinToken: string, tokenHash: string): Promise<JoinResolveResponse | null> {
  const networkCount = incrementCounter(joinResolveNetworkCounts, tokenHash);
  logJoinResolveEvent("network_fetch", tokenHash, { networkCount });

  const response = await retryTransientRequest(
    () =>
      fetch(
        `${webinarApiUrl}/v2/join/resolve?t=${encodeURIComponent(rawJoinToken)}`,
        {
          cache: "no-store",
        },
      ),
    {
      maxAttempts: 3,
      initialDelayMs: 300,
      maxDelayMs: 1_500,
      shouldRetryResponse: (response) => response.status >= 500,
    },
  );

  if (!response.ok) {
    if (response.status >= 500) {
      Sentry.captureMessage("join resolve failed after retries", {
        level: "error",
        tags: {
          area: "join-resolve",
        },
        extra: {
          tokenHash,
          status: response.status,
        },
      });
    }

    logJoinResolveEvent("network_response", tokenHash, {
      networkCount,
      ok: false,
      status: response.status,
    });
    return null;
  }

  logJoinResolveEvent("network_response", tokenHash, {
    networkCount,
    ok: true,
    status: response.status,
  });

  return (await response.json()) as JoinResolveResponse;
}

export async function resolveJoin(rawJoinToken: string): Promise<JoinResolveResponse | null> {
  const tokenHash = hashJoinToken(rawJoinToken);
  const requestCount = incrementCounter(joinResolveCallCounts, tokenHash);
  const now = Date.now();

  pruneExpiredEntries(now);
  logJoinResolveEvent("request", tokenHash, { requestCount });

  const cached = joinResolveCache.get(rawJoinToken);
  if (cached && cached.expiresAt > now) {
    logJoinResolveEvent("cache_hit", tokenHash, {
      requestCount,
      expiresInMs: cached.expiresAt - now,
    });
    return cached.promise;
  }

  const promise = fetchJoinResolve(rawJoinToken, tokenHash);
  joinResolveCache.set(rawJoinToken, {
    expiresAt: now + JOIN_RESOLVE_CACHE_TTL_MS,
    promise,
  });

  try {
    return await promise;
  } catch (error) {
    joinResolveCache.delete(rawJoinToken);
    Sentry.captureException(error, {
      tags: {
        area: "join-resolve",
      },
      extra: {
        tokenHash,
      },
    });
    logJoinResolveEvent("network_error", tokenHash, {
      requestCount,
      message: error instanceof Error ? error.message : "unknown",
    });
    throw error;
  }
}
