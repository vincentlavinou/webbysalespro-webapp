"use client";

import { useEffect, useRef } from "react";
import { z } from "zod";
import { onPlaybackMetadata } from "../playbackEventEmitter";

type BaseEvent<TType extends string, TPayload> = {
  type: TType;
  payload: TPayload;
};

const DEFAULT_SEEN_EVENT_KEY_LIMIT = 500;

/**
 * Generic hook to listen for IVS metadata messages emitted through playbackEventEmitter.
 * - filters by event type
 * - validates payload via zod schema
 * - optional session_id filter
 * - optional exact dedupe by event_key
 * - optional stale-state rejection by entity/type scope
 * - optional legacy dedupe signature
 */
export function usePlaybackMetadataEvent<
  TType extends string,
  TPayload extends { session_id?: string; event_key?: string }
>({
    eventType,
    schema,
    sessionId,
    onEvent,
    getEventKey,
    getStateScope,
    compareEventKeys,
    getSignature,
    onError
  } : {
    eventType: TType;
    schema: z.ZodType<BaseEvent<TType, TPayload>>;
    sessionId?: string;
    onEvent: (evt: BaseEvent<TType, TPayload>) => void;
    getEventKey?: (evt: BaseEvent<TType, TPayload>) => string | undefined;
    getStateScope?: (evt: BaseEvent<TType, TPayload>) => string | undefined;
    compareEventKeys?: (incoming: string, latestApplied: string) => number;
    getSignature?: (evt: BaseEvent<TType, TPayload>) => string;
    onError?: (error: string) => void
  }
) {
  const lastSigRef = useRef<string>("");
  const seenEventKeysRef = useRef<Set<string>>(new Set());
  const seenEventKeyOrderRef = useRef<string[]>([]);
  const latestEventKeyByScopeRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    return onPlaybackMetadata((raw) => {
      // raw might already be an object if you emit parsed JSON — handle both
      const obj: unknown =
        typeof raw === "string"
          ? (() => {
            try {
              return JSON.parse(raw);
            } catch {
              return null;
            }
          })()
          : raw;

      if (!obj || typeof obj !== "object") {
        onError?.(`obj: ${obj} is not equal to an object or is undefined`)
        return
      };

      // fast pre-filter (avoid zod cost for other event types)
      const type = (obj as { type: TType, payload: TPayload }).type;
      if (type !== eventType) {
        onError?.(`Type: ${type} is not equal to ${eventType}`)
        return
      };

      const parsed = schema.safeParse(obj);
      if (!parsed.success) {
        onError?.(`Parsed Error: ${parsed.error}`)
        return
      };

      const evt = parsed.data;
      const resolvedEventKey = getEventKey?.(evt) ?? evt.payload?.event_key;

      // optional session filter
      if (sessionId && evt.payload?.session_id && evt.payload.session_id !== sessionId) {
        onError?.(`Session id: ${sessionId} is not equal to ${evt.payload.session_id}`)
        return
      };

      if (resolvedEventKey) {
        if (seenEventKeysRef.current.has(resolvedEventKey)) {
          onError?.(`Duplicate event_key ignored: ${resolvedEventKey}`);
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
              `Stale event_key ignored for scope ${stateScope}: ${resolvedEventKey} <= ${latestAppliedEventKey}`
            );
            return;
          }
        }
      }

      // optional dedupe
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
          if (oldestEventKey) seenEventKeysRef.current.delete(oldestEventKey);
        }

        const stateScope = getStateScope?.(evt);
        if (stateScope) {
          latestEventKeyByScopeRef.current.set(stateScope, resolvedEventKey);
        }
      }

      onEvent(evt);
    });
  }, [
    eventType,
    schema,
    sessionId,
    onEvent,
    getEventKey,
    getStateScope,
    compareEventKeys,
    getSignature,
    onError,
  ]);
}
