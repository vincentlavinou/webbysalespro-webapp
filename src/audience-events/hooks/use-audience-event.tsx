"use client";

import { useEffect, useRef } from "react";
import { ChatEvent } from "amazon-ivs-chat-messaging";
import { z } from "zod";
import { onPlaybackMetadata } from "@/emitter/playback/playbackEventEmitter";
import { onAudienceChatEvent } from "../service/event-emitter";
import { AudienceEvent, AudienceRole } from "../service/type";

const DEFAULT_SEEN_EVENT_KEY_LIMIT = 500;

function parseStreamEnvelope(raw: unknown): unknown {
  if (typeof raw !== "string") {
    return raw;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseJsonAttribute(value: string | undefined, fallback: unknown): unknown {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseChatEnvelope(event: ChatEvent): unknown {
  return {
    type: event.attributes?.type ?? event.eventName,
    version: Number(event.attributes?.version),
    session_id: event.attributes?.session_id,
    event_key: event.attributes?.event_key,
    emitted_at: event.attributes?.emitted_at,
    audience: parseJsonAttribute(event.attributes?.audience_json, []),
    payload: parseJsonAttribute(event.attributes?.payload_json, {}),
  };
}

export function useAudienceEvent<
  TType extends string,
  TPayload extends Record<string, unknown>,
>({
  eventType,
  schema,
  sessionId,
  targetAudience = "attendee",
  onEvent,
  getEventKey,
  getStateScope,
  compareEventKeys,
  getSignature,
  onError,
}: {
  eventType: TType;
  schema: z.ZodType<AudienceEvent<TType, TPayload>>;
  sessionId?: string;
  targetAudience?: AudienceRole;
  onEvent: (evt: AudienceEvent<TType, TPayload>) => void;
  getEventKey?: (evt: AudienceEvent<TType, TPayload>) => string | undefined;
  getStateScope?: (evt: AudienceEvent<TType, TPayload>) => string | undefined;
  compareEventKeys?: (incoming: string, latestApplied: string) => number;
  getSignature?: (evt: AudienceEvent<TType, TPayload>) => string;
  onError?: (error: string) => void;
}) {
  const lastSigRef = useRef("");
  const seenEventKeysRef = useRef<Set<string>>(new Set());
  const seenEventKeyOrderRef = useRef<string[]>([]);
  const latestEventKeyByScopeRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const processEnvelope = (obj: unknown, transport: "stream" | "chat") => {
      if (!obj || typeof obj !== "object") {
        onError?.(`[${transport}] event is not an object`);
        return;
      }

      const type = (obj as { type?: string }).type;
      if (type !== eventType) {
        return;
      }

      const parsed = schema.safeParse(obj);
      if (!parsed.success) {
        onError?.(`[${transport}] ${parsed.error}`);
        return;
      }

      const evt = parsed.data;

      if (sessionId && evt.session_id !== sessionId) {
        onError?.(
          `[${transport}] session_id ${evt.session_id} does not match ${sessionId}`,
        );
        return;
      }

      if (!evt.audience.includes(targetAudience)) {
        return;
      }

      const resolvedEventKey = getEventKey?.(evt) ?? evt.event_key;

      if (resolvedEventKey) {
        if (seenEventKeysRef.current.has(resolvedEventKey)) {
          onError?.(`[${transport}] duplicate event_key ignored: ${resolvedEventKey}`);
          return;
        }

        const stateScope = getStateScope?.(evt);
        if (stateScope && compareEventKeys) {
          const latestAppliedEventKey = latestEventKeyByScopeRef.current.get(stateScope);
          if (
            latestAppliedEventKey &&
            compareEventKeys(resolvedEventKey, latestAppliedEventKey) <= 0
          ) {
            onError?.(
              `[${transport}] stale event_key ignored for scope ${stateScope}: ${resolvedEventKey} <= ${latestAppliedEventKey}`,
            );
            return;
          }
        }
      }

      if (getSignature) {
        const sig = getSignature(evt);
        if (sig && lastSigRef.current === sig) return;
        lastSigRef.current = sig;
      }

      if (resolvedEventKey) {
        seenEventKeysRef.current.add(resolvedEventKey);
        seenEventKeyOrderRef.current.push(resolvedEventKey);

        if (seenEventKeyOrderRef.current.length > DEFAULT_SEEN_EVENT_KEY_LIMIT) {
          const oldestEventKey = seenEventKeyOrderRef.current.shift();
          if (oldestEventKey) {
            seenEventKeysRef.current.delete(oldestEventKey);
          }
        }

        const stateScope = getStateScope?.(evt);
        if (stateScope) {
          latestEventKeyByScopeRef.current.set(stateScope, resolvedEventKey);
        }
      }

      onEvent(evt);
    };

    const offPlayback = onPlaybackMetadata((raw: string) => {
      processEnvelope(parseStreamEnvelope(raw), "stream");
    });
    const offChat = onAudienceChatEvent((event) => {
      processEnvelope(parseChatEnvelope(event), "chat");
    });

    return () => {
      offPlayback();
      offChat();
    };
  }, [
    compareEventKeys,
    eventType,
    getEventKey,
    getSignature,
    getStateScope,
    onError,
    onEvent,
    schema,
    sessionId,
    targetAudience,
  ]);
}
