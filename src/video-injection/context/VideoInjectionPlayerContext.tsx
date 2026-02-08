"use client";

import { createContext } from "react";

export type VideoInjectionPlayerContextType = {
  isActive: boolean;
  playbackUrl: string | null;
  title: string | null;
  durationMs: number | null;
  elapsedSeconds: number | null;
  videoInjectionId: string | null;
};

export const VideoInjectionPlayerContext =
  createContext<VideoInjectionPlayerContextType>({
    isActive: false,
    playbackUrl: null,
    title: null,
    durationMs: null,
    elapsedSeconds: null,
    videoInjectionId: null,
  });
