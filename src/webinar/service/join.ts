import { webinarAppUrl } from ".";
import type { RegisterV2Response } from "./type";

type JoinResponseLike = Pick<RegisterV2Response, "grants">;

function getNormalizedWebinarAppUrl() {
  return webinarAppUrl.replace(/\/+$/, "");
}

export function extractJoinToken(response: JoinResponseLike | null | undefined) {
  for (const grant of response?.grants ?? []) {
    if (typeof grant.join_url === "string" && grant.join_url.length > 0) {
      try {
        const parsed = new URL(grant.join_url, getNormalizedWebinarAppUrl());
        const token = parsed.searchParams.get("t");
        if (token) {
          return token;
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

export function extractJoinUrl(response: JoinResponseLike | null | undefined) {
  for (const grant of response?.grants ?? []) {
    if (typeof grant.join_url === "string" && grant.join_url.length > 0) {
      return grant.join_url;
    }
  }

  return null;
}

export function didShortLinkResolutionFail(response: JoinResponseLike | null | undefined) {
  return response?.grants.some((grant) => grant.short_link_resolution_failed === true) ?? false;
}
