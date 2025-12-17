export const playbackEventEmitter = new EventTarget();

export const PLAYBACK_EVENTS = {
  METADATA: "playback:metadata",
} as const;

export function emitPlaybackMetadata(detail: string) {
  playbackEventEmitter.dispatchEvent(
    new CustomEvent(PLAYBACK_EVENTS.METADATA, { detail })
  );
}

export function onPlaybackMetadata(handler: (detail: string) => void) {
  const listener = (event: Event) => handler((event as CustomEvent).detail);
  playbackEventEmitter.addEventListener(PLAYBACK_EVENTS.METADATA, listener);
  return () => playbackEventEmitter.removeEventListener(PLAYBACK_EVENTS.METADATA, listener);
}
