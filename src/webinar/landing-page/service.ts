import { webinarApiUrl } from "@/webinar/service";
import type { PublicQueryParams } from "@/webinar/service/action";
import type { LandingPageRender } from "./types";

export async function getPublicLandingPage(webinarId: string, slug: string, query?: PublicQueryParams): Promise<LandingPageRender | null> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) params.append(key, item);
    }
  }
  params.set("slug", slug);
  const response = await fetch(
    `${webinarApiUrl}/v2/webinars/${webinarId}/landing-pages/render/?${params.toString()}`,
    { cache: "no-store" },
  );

  if (!response.ok) return null;
  return response.json() as Promise<LandingPageRender>;
}
