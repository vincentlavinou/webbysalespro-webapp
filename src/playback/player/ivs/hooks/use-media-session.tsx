// components/ivs/hooks/use-media-session.tsx
"use client";

import { useEffect, useRef } from "react";

type Options = {
  active: boolean;
  title?: string;
  ariaLabel: string;
  poster?: string;
  artwork?: MediaImage[];
  onPlay?: () => void;
  onPause?: () => void;
};

export function useMediaSession({
  active,
  title,
  ariaLabel,
  poster,
  artwork,
  onPlay,
  onPause,
}: Options) {
  // Keep handlers in refs so re-creating the inline callbacks each render does
  // NOT tear down and rebuild the MediaSession. Tearing the session down is
  // what makes Android Chrome drop background audio, so the session lifecycle
  // must depend on `active` alone.
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  useEffect(() => { onPlayRef.current = onPlay; }, [onPlay]);
  useEffect(() => { onPauseRef.current = onPause; }, [onPause]);

  // ─── Session lifecycle — established/torn down on `active` only ───────────
  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

    navigator.mediaSession.setActionHandler("play", () => onPlayRef.current?.());
    navigator.mediaSession.setActionHandler("pause", () => onPauseRef.current?.());
    navigator.mediaSession.playbackState = "playing";

    return () => {
      try {
        navigator.mediaSession.playbackState = "none";
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
      } catch {}
    };
  }, [active]);

  // ─── Metadata — updated independently so it never drops the session ───────
  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;

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
  }, [active, title, ariaLabel, poster, artwork]);
}
