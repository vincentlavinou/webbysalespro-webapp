// components/ivs/hooks/use-media-session.tsx
"use client";

import { useEffect } from "react";

type Options = {
  active: boolean;
  title?: string;
  ariaLabel: string;
  poster?: string;
  artwork?: MediaImage[];
  onPlay?: () => void;
};

export function useMediaSession({
  active,
  title,
  ariaLabel,
  poster,
  artwork,
  onPlay,
}: Options) {
  useEffect(() => {
    if (!active) return;
    if (!("mediaSession" in navigator)) return;

    const resolvedArtwork: MediaImage[] =
      artwork && artwork.length > 0
        ? artwork
        : poster
          ? [{ src: poster, sizes: "512x512", type: "image/jpeg" }]
          : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: title || ariaLabel,
      artist: "Live Webinar",
      artwork: resolvedArtwork,
    });

    navigator.mediaSession.playbackState = "playing";
    navigator.mediaSession.setActionHandler("play", () => onPlay?.());
    navigator.mediaSession.setActionHandler("pause", null);

    return () => {
      try {
        navigator.mediaSession.playbackState = "none";
        navigator.mediaSession.setActionHandler("play", null);
      } catch {}
    };
  }, [active, title, ariaLabel, poster, artwork, onPlay]);
}