import { webinarApiUrl } from "@/webinar/service";
import type { LandingPageRender } from "./types";

export async function getPublicLandingPage(webinarId: string, slug: string): Promise<LandingPageRender | null> {
  const params = new URLSearchParams({ slug });
  const response = await fetch(
    `${webinarApiUrl}/v2/webinars/${webinarId}/landing-pages/render/?${params.toString()}`,
    { cache: "no-store" },
  );

  if (!response.ok) return null;
  return response.json() as Promise<LandingPageRender>;
}
