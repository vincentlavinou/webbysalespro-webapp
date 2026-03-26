import { headers } from "next/headers";

type HeaderLike = {
  get(name: string): string | null;
};

export type AttendeeLocation = {
  city?: string;
  state?: string;
  countryCode?: string;
  ip?: string;
};

type ExternalGeoResponse = {
  city?: unknown;
  state?: unknown;
  country_code?: unknown;
  countryCode?: unknown;
  country?: unknown;
  region?: unknown;
  region_name?: unknown;
  subdivision?: unknown;
  subdivision_1_name?: unknown;
};

const LOCATION_LOOKUP_TIMEOUT_MS = 1500;

function normalize(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function firstIp(value: string | null): string | undefined {
  const ip = value?.split(",")[0]?.trim();
  return ip ? ip : undefined;
}

function parseNetlifyGeo(value: string | null): AttendeeLocation | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as {
      city?: unknown;
      subdivision?:
        | unknown
        | {
            code?: unknown;
            name?: unknown;
          };
      country?: unknown;
      countryCode?: unknown;
      country_code?: unknown;
    };
    const subdivision =
      parsed.subdivision && typeof parsed.subdivision === "object"
        ? parsed.subdivision as { code?: unknown; name?: unknown }
        : null;
    const country =
      parsed.country && typeof parsed.country === "object"
        ? parsed.country as { code?: unknown; name?: unknown }
        : null;

    return {
      city: normalize(typeof parsed.city === "string" ? parsed.city : undefined),
      state: normalize(
        typeof parsed.subdivision === "string"
          ? parsed.subdivision
          : typeof subdivision?.name === "string"
            ? subdivision.name
            : typeof subdivision?.code === "string"
              ? subdivision.code
              : undefined
      ),
      countryCode: normalize(
        typeof parsed.countryCode === "string"
          ? parsed.countryCode
          : typeof parsed.country_code === "string"
            ? parsed.country_code
          : typeof parsed.country === "string"
            ? parsed.country
            : typeof country?.code === "string"
              ? country.code
            : undefined
      ),
    };
  } catch {
    return null;
  }
}

function fromHeaders(headerStore: HeaderLike): AttendeeLocation | null {
  const netlifyGeo = parseNetlifyGeo(headerStore.get("x-nf-geo"));
  if (netlifyGeo?.city || netlifyGeo?.state || netlifyGeo?.countryCode) {
    return {
      ...netlifyGeo,
      ip:
        firstIp(headerStore.get("x-forwarded-for")) ??
        normalize(headerStore.get("x-real-ip")) ??
        normalize(headerStore.get("client-ip")),
    };
  }

  const city = normalize(
    headerStore.get("x-vercel-ip-city") ??
      headerStore.get("cf-ipcity")
  );
  const state = normalize(
    headerStore.get("x-vercel-ip-country-region") ??
      headerStore.get("cf-region")
  );
  const countryCode = normalize(
    headerStore.get("x-vercel-ip-country") ??
      headerStore.get("cf-ipcountry")
  );
  const ip =
    firstIp(headerStore.get("x-forwarded-for")) ??
    normalize(headerStore.get("x-real-ip")) ??
    normalize(headerStore.get("cf-connecting-ip"));

  if (!city && !state && !countryCode && !ip) {
    return null;
  }

  return {
    city,
    state,
    countryCode,
    ip,
  };
}

async function lookupExternalGeo(ip: string): Promise<AttendeeLocation | null> {
  const urlTemplate = process.env.IP_GEOLOCATION_API_URL ? process.env.IP_GEOLOCATION_API_URL : process.env.NEXT_PUBLIC_IP_GEOLOCATION_API_URL
  if (!urlTemplate) return null;

  const url = urlTemplate.includes("{ip}")
    ? urlTemplate.replace("{ip}", encodeURIComponent(ip))
    : `${urlTemplate}${urlTemplate.includes("?") ? "&" : "?"}ip=${encodeURIComponent(ip)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOCATION_LOOKUP_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(process.env.IP_GEOLOCATION_API_KEY
          ? { Authorization: `Bearer ${process.env.IP_GEOLOCATION_API_KEY}` }
          : {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ExternalGeoResponse;
    const city = normalize(typeof payload.city === "string" ? payload.city : undefined);
    const state = normalize(
      typeof payload.state === "string"
        ? payload.state
        : typeof payload.region === "string"
          ? payload.region
          : typeof payload.region_name === "string"
            ? payload.region_name
            : typeof payload.subdivision === "string"
              ? payload.subdivision
              : typeof payload.subdivision_1_name === "string"
                ? payload.subdivision_1_name
                : undefined
    );
    const countryCode = normalize(
      typeof payload.country_code === "string"
        ? payload.country_code
        : typeof payload.countryCode === "string"
          ? payload.countryCode
          : typeof payload.country === "string"
            ? payload.country
            : undefined
    );

    if (!city && !state && !countryCode) {
      return null;
    }

    return { city, state, countryCode, ip };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveAttendeeLocation(): Promise<AttendeeLocation | null> {
  const headerStore = await headers();
  const resolvedFromHeaders = fromHeaders(headerStore);

  if (resolvedFromHeaders?.city || resolvedFromHeaders?.state) {
    return resolvedFromHeaders;
  }

  if (!resolvedFromHeaders?.ip) {
    return null;
  }

  const externalLocation = await lookupExternalGeo(resolvedFromHeaders.ip);
  if (!externalLocation) {
    return resolvedFromHeaders;
  }

  return {
    city: externalLocation.city ?? resolvedFromHeaders.city,
    state: externalLocation.state ?? resolvedFromHeaders.state,
    countryCode: externalLocation.countryCode ?? resolvedFromHeaders.countryCode,
    ip: resolvedFromHeaders.ip,
  };
}
