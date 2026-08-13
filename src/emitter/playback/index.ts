export {
    emitPlaybackMetadata,
    emitPlaybackEnded,
    onPlaybackEnded,
    emitPlaybackPlaying,
    onPlaybackPlaying,
} from './playbackEventEmitter'

// `usePlaybackMetadataEvent` is gone. It was a second, drifted copy of
// `useAudienceEvent` — no audience gating, de-dupe state that never reset, and
// a listener that re-subscribed on every render — and it had no consumers left.
// Timed metadata now reaches the shared dispatcher as one of the sources in
// `@/audience-events/service/sources`.