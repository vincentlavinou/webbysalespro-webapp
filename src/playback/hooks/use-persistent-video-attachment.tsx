"use client";

import { useEffect, useLayoutEffect } from "react";

type PictureInPictureAwareVideo = HTMLVideoElement & {
  disablePictureInPicture?: boolean;
};

type Options = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  hiddenHostRef: React.RefObject<HTMLDivElement | null>;
  attachedStyle: string;
  detachedStyle: string;
  poster?: string;
  ariaLabel?: string;
};

export function usePersistentVideoAttachment({
  videoRef,
  containerRef,
  hiddenHostRef,
  attachedStyle,
  detachedStyle,
  poster,
  ariaLabel,
}: Options) {
  useLayoutEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    const host = hiddenHostRef.current;
    if (!video || !container) return;

    const attachVideo = () => {
      if (poster) video.poster = poster;
      if (ariaLabel) video.setAttribute("aria-label", ariaLabel);
      video.style.cssText = attachedStyle;
      if (video.parentElement !== container) {
        container.appendChild(video);
      }
    };

    attachVideo();

    return () => {
      video.style.cssText = detachedStyle;
      if (host && video.parentElement !== host) {
        host.appendChild(video);
      }
    };
  }, [
    videoRef,
    containerRef,
    hiddenHostRef,
    attachedStyle,
    detachedStyle,
    poster,
    ariaLabel,
  ]);

  useEffect(() => {
    const video = videoRef.current as PictureInPictureAwareVideo | null;
    const container = containerRef.current;
    if (!video || !container) return;

    const attachIfNeeded = () => {
      if (video.parentElement === container) return;
      if (poster) video.poster = poster;
      if (ariaLabel) video.setAttribute("aria-label", ariaLabel);
      video.style.cssText = attachedStyle;
      container.appendChild(video);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      window.setTimeout(attachIfNeeded, 0);
    };

    const onLeavePictureInPicture = () => {
      window.setTimeout(attachIfNeeded, 0);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", attachIfNeeded);
    video.addEventListener(
      "leavepictureinpicture",
      onLeavePictureInPicture as EventListener,
    );

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", attachIfNeeded);
      video.removeEventListener(
        "leavepictureinpicture",
        onLeavePictureInPicture as EventListener,
      );
    };
  }, [videoRef, containerRef, attachedStyle, poster, ariaLabel]);
}
