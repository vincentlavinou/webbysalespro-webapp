// Runtime-safe mirrors of the `amazon-ivs-player` enum *values*.
//
// The IVS player SDK reads `window` while its module is being evaluated, which
// throws `ReferenceError: window is not defined` in the Edge runtime during SSR
// (attendee/holding-room routes run on `runtime = 'edge'`). Statically importing
// enum values from "amazon-ivs-player" pulls the whole browser-only SDK into the
// server bundle and triggers that crash at module load.
//
// These local constants carry the exact same string values as the SDK enums and
// are typed as those enums (via type-only `import(...)`, which is erased at
// compile time and never bundled), so call sites stay fully type-checked.
//
// Use these for *value* references. Keep `import type { ... }` from the SDK for
// pure type usage, and `await import("amazon-ivs-player")` to load the player.

export type PlayerState = import("amazon-ivs-player").PlayerState;
export const PlayerState = {
  IDLE: "Idle",
  READY: "Ready",
  BUFFERING: "Buffering",
  PLAYING: "Playing",
  ENDED: "Ended",
} as unknown as typeof import("amazon-ivs-player").PlayerState;

// Only the members referenced statically in this codebase are defined here; add
// more if you need to reference them outside of a dynamic `await import(...)`.
export type PlayerEventType = import("amazon-ivs-player").PlayerEventType;
export const PlayerEventType = {
  ERROR: "PlayerError",
  TEXT_METADATA_CUE: "PlayerTextMetadataCue",
} as unknown as typeof import("amazon-ivs-player").PlayerEventType;
