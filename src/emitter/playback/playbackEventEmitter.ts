export const playbackEventEmitter = new EventTarget();

export const PLAYBACK_EVENTS = {
  METADATA: "playback:metadata",
  ENDED: "playback:ended",
  PLAYING: "playback:playing",
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

export function emitPlaybackEnded() {
  playbackEventEmitter.dispatchEvent(new CustomEvent(PLAYBACK_EVENTS.ENDED));
}

export function onPlaybackEnded(handler: () => void) {
  playbackEventEmitter.addEventListener(PLAYBACK_EVENTS.ENDED, handler);
  return () => playbackEventEmitter.removeEventListener(PLAYBACK_EVENTS.ENDED, handler);
}

export function emitPlaybackPlaying() {
  playbackEventEmitter.dispatchEvent(new CustomEvent(PLAYBACK_EVENTS.PLAYING));
}

export function onPlaybackPlaying(handler: () => void) {
  playbackEventEmitter.addEventListener(PLAYBACK_EVENTS.PLAYING, handler);
  return () => playbackEventEmitter.removeEventListener(PLAYBACK_EVENTS.PLAYING, handler);
}
