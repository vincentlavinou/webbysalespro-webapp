"use client";

import {
  parseChatEnvelope,
  parseStreamEnvelope,
} from "@lavinou/webbysalespro/realtime";
import type { AudienceEventSource } from "@lavinou/webbysalespro/realtime/react";
import { onPlaybackMetadata } from "@/emitter/playback/playbackEventEmitter";
import { onAudienceChatEvent } from "./event-emitter";

/**
 * The transports audience events reach this app over.
 *
 * The backend sends the same envelope down both — `send_audience_event` fans
 * out to IVS timed metadata and IVS chat — so an event routinely arrives twice.
 * De-duplication by `event_key` inside the shared dispatcher is what collapses
 * that into one apply, which is why both sources feed a single provider rather
 * than each hook subscribing on its own.
 *
 * Declared at module scope so their identities are stable: the provider
 * compares source members and would otherwise tear down and re-establish both
 * subscriptions on every render.
 */

export const playbackMetadataSource: AudienceEventSource = (emit) =>
  onPlaybackMetadata((raw) => emit(parseStreamEnvelope(raw), "stream"));

export const chatEventSource: AudienceEventSource = (emit) =>
  onAudienceChatEvent((event) => emit(parseChatEnvelope(event), "chat"));

export const audienceEventSources: AudienceEventSource[] = [
  playbackMetadataSource,
  chatEventSource,
];
