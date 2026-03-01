import "server-only";

import type { QueryParams } from "@sanity/client";
import { draftMode } from "next/headers";
import { client } from "./client";

const DEFAULT_PARAMS = {} as QueryParams;
const DEFAULT_TAGS = [] as string[];

export const token = process.env.SANITY_API_READ_TOKEN;

export async function sanityFetch<QueryResponse>({
  query,
  params = DEFAULT_PARAMS,
  tags = DEFAULT_TAGS,
}: {
  query: string;
  params?: QueryParams;
  tags?: string[];
}): Promise<QueryResponse> {

  const isDevelopment = process.env.NODE_ENV === "development";
  const { isEnabled: isDraftMode } = await draftMode();
  
  return client
    .withConfig({ useCdn: !isDevelopment && !isDraftMode })
    .fetch<QueryResponse>(query, params, {
      cache: isDevelopment || isDraftMode ? "no-store" : "force-cache",
      next: {
        tags,
        revalidate: isDraftMode ? 0 : 300,
      },
    });
}
