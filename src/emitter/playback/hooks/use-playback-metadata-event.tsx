"use client";

import { DependencyList, useEffect, useRef } from "react";
import { z } from "zod";
import { onPlaybackMetadata } from "../playbackEventEmitter";

type BaseEvent<TType extends string, TPayload> = {
  type: TType;
  payload: TPayload;
};

/**
 * Generic hook to listen for IVS metadata messages emitted through playbackEventEmitter.
 * - filters by event type
 * - validates payload via zod schema
 * - optional session_id filter
 * - optional dedupe signature
 */
export function usePlaybackMetadataEvent<
  TType extends string,
  TPayload extends { session_id?: string }
>({
    eventType,
    schema,
    sessionId,
    onEvent,
    getSignature
  } : {
    eventType: TType;
    schema: z.ZodType<BaseEvent<TType, TPayload>>;
    sessionId?: string;
    onEvent: (evt: BaseEvent<TType, TPayload>) => void;
    getSignature?: (evt: BaseEvent<TType, TPayload>) => string;
  }, dependecies: DependencyList
) {
  const lastSigRef = useRef<string>("");

  useEffect(() => {
    return onPlaybackMetadata((raw) => {
      // raw might already be an object if you emit parsed JSON — handle both
      console.log(`Raw Event: ${raw}`)
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

      console.log(`Object: ${obj}`)
      if (!obj || typeof obj !== "object") return;

      // fast pre-filter (avoid zod cost for other event types)
      const type = (obj as { type: TType, payload: TPayload }).type;
      console.log(`Type: ${type} - ${eventType}`)
      if (type !== eventType) return;

      const parsed = schema.safeParse(obj);
      console.log(`Parsed Error: ${parsed.error}`)
      console.log(`Parsed Data: ${parsed.data}`)
      if (!parsed.success) return;

      const evt = parsed.data;

      console.log(`Session Id: ${evt.payload.session_id} - ${sessionId}`)
      // optional session filter
      if (sessionId && evt.payload?.session_id && evt.payload.session_id !== sessionId) return;

      // optional dedupe
      if (getSignature) {
        const sig = getSignature(evt);
        if (sig && lastSigRef.current === sig) return;
        lastSigRef.current = sig;
      }

      onEvent(evt);
    });
  }, [eventType, schema, sessionId, onEvent, getSignature, ...dependecies]);
}
