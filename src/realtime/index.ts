// The Pusher + SSE transport selector that used to live here is gone. Pusher is
// the only transport the backend still serves — `client_config()` hardcodes
// `use_pusher: True` now that SSE has been removed — and the socket, channel
// subscription, auth retry and tab/network lifecycle are shared with the admin
// console via `@lavinou/webbysalespro/realtime`.
//
// Subscribe with `usePusherChannel` beneath the `RealtimePusherProvider` that
// `WebinarProvider` mounts; `SessionChannelBridge` is the example.

export { SessionChannelBridge } from "./components/SessionChannelBridge"
export { getRealtimeConfig } from "./service/action"
export type { RealtimeConfig } from "./service/type"
