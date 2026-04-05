'use client';

import { createContext } from "react";

export type PlaybackStatus =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "buffering"
  | "ended"
  | "error";

export type PlaybackRuntimeContextType = {
  status: PlaybackStatus;
  isChatEnabled: boolean;
  setStatus: (status: PlaybackStatus) => void;
};

export const PlaybackRuntimeContext = createContext<PlaybackRuntimeContextType>({
  status: "idle",
  isChatEnabled: false,
  setStatus: () => {},
});
