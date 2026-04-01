---
name: stream-refresh
description: Hydration pattern for the WebbySalesPro attendee live stream. Use this skill whenever you are adding, editing, or reviewing any provider or component that fetches data on load for the attendee stream view — including anything that uses onPlaybackPlaying, a mount-time useEffect fetch, or consumes IVS timed metadata events to populate initial state. Also invoke when someone asks why something isn't updating after a stream refresh, or when wiring up a new data source to the live attendee experience.
---

# Stream Refresh Hydration Pattern

In the attendee live stream, data is hydrated in two ways:
1. **On mount / on playback start** — providers fetch initial state via server actions when the component mounts or when `onPlaybackPlaying` fires.
2. **Live updates** — IVS timed metadata events (`usePlaybackMetadataEvent`) push state changes during the stream.

When an attendee taps **"Refresh stream"** (`StreamRefreshControl`), only the IVS player is reloaded (`restoreToLive`). Any data hydrated via method 1 is now stale. **Any provider that fetches on load must also re-fetch when the stream is refreshed.**

## The Contract

Whenever you write or modify a provider that fetches data on mount (or via `onPlaybackPlaying`), add a `webinar:stream:refresh` listener that re-runs the same fetch:

```ts
useEffect(() => {
    const handleStreamRefresh = () => {
        yourFetchFn({ sessionId }).then((result) => {
            if (result?.data) setState(result.data);
        });
    };
    window.addEventListener("webinar:stream:refresh", handleStreamRefresh);
    return () => window.removeEventListener("webinar:stream:refresh", handleStreamRefresh);
}, [sessionId]);
```

The event is dispatched by `handleRefreshStream` in both `AttendeeDesktopLayout` and `AttendeeMobileLayout` after `restoreToLive` completes.

## Already Implemented

| Provider | Fetches on load | Refresh listener |
|---|---|---|
| `ChatProvider` | `getAttendeeChatSession` | ✅ |
| `OfferSessionClientProvider` | `getOfferSessionsForAttendee` | ✅ |
| `VideoInjectionPlayerProvider` | `getVideoInjectionState` | ✅ (see note below) |

## Before Wiring Up a New Listener

Check that the attendee-side consumer is actually rendering. A provider can be mounted without its output being visible — for example, `VideoInjectionPlayerProvider` has the refresh listener but `<VideoInjectionPlayer />` is currently commented out in `AttendeeDesktopLayout`, so the re-hydrated state has no effect.

**Before adding a listener, verify:**
- Is the context consumed by a component that renders in the attendee view?
- Is that component actually mounted (not commented out or behind a disabled flag)?

If the consumer isn't active, skip the listener until the feature is live — adding it silently is fine, but call it out in a comment so the next developer knows the state.

## Checklist for New Attendee-Side Providers

- [ ] Fetches data on mount or `onPlaybackPlaying`
- [ ] Has a `webinar:stream:refresh` listener that re-fetches the same data
- [ ] Attendee-side consumer is confirmed to be rendering

## The Event

```ts
// dispatched in AttendeeDesktopLayout and AttendeeMobileLayout
window.dispatchEvent(new CustomEvent("webinar:stream:refresh"));
```

No payload — listeners should re-fetch from their own server action using the `sessionId` already in scope.
