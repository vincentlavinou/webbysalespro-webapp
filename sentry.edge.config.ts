import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/sentry-scrub";

const isProd = (process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV) === "production";
const defaultTracesRate = isProd ? "0.01" : "0.1";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? defaultTracesRate),
  beforeSend: scrubSentryEvent,
  beforeSendTransaction: scrubSentryEvent,
});
