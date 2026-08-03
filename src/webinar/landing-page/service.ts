import { webinarApiUrl } from "@/webinar/service";
import type { PublicQueryParams } from "@/webinar/service/action";
import type { LandingPageRender } from "./types";
import { cache } from "react";

function createLandingPageQuery(query?: PublicQueryParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) params.append(key, item);
    }
  }
  params.sort();
  return params.toString();
}

const getPublicLandingPageCached = cache(async (webinarId: string, queryString: string): Promise<LandingPageRender | null> => {
  const response = await fetch(
    `${webinarApiUrl}/v2/webinars/${webinarId}/landing-pages/render/?${queryString}`,
    { cache: "no-store" },
  );

  if (!response.ok) return null;
  return response.json() as Promise<LandingPageRender>;
});

export async function getPublicLandingPage(webinarId: string, slug: string, query?: PublicQueryParams): Promise<LandingPageRender | null> {
  return getPublicLandingPageCached(webinarId, createLandingPageQuery({ ...query, slug }));
}
