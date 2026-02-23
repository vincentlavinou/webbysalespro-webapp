// components/ivs/hooks/use-pip.ts
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface WebKitVideoElement extends HTMLVideoElement {
  webkitSupportsPresentationMode?: (mode: string) => boolean;
  webkitSetPresentationMode?: (mode: string) => void;
  webkitPresentationMode?: string;
}

interface DocumentWithPiP extends Document {
  pictureInPictureEnabled: boolean;
  pictureInPictureElement: Element | null;
  exitPictureInPicture: () => Promise<void>;
}

export function usePiP(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onLeavePiPRestore?: () => void
) {
  const [isInPiP, setIsInPiP] = useState(false);
  const isPiPRef = useRef(false);

  const enterPiP = useCallback(async () => {
    const video = videoRef.current as WebKitVideoElement | null;
    if (!video) return;
    try {
      const doc = document as DocumentWithPiP;
      if (doc.pictureInPictureEnabled && !doc.pictureInPictureElement) {
        await video.requestPictureInPicture();
        return;
      }
      if (video.webkitSupportsPresentationMode?.("picture-in-picture")) {
        video.webkitSetPresentationMode?.("picture-in-picture");
      }
    } catch {}
  }, [videoRef]);

  const exitPiP = useCallback(() => {
    const video = videoRef.current as WebKitVideoElement | null;
    try {
      const doc = document as DocumentWithPiP;
      if (doc.pictureInPictureElement) doc.exitPictureInPicture().catch(() => {});
      if (video?.webkitPresentationMode === "picture-in-picture") {
        video.webkitSetPresentationMode?.("inline");
      }
    } catch {}
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current as WebKitVideoElement | null;
    if (!video) return;

    const onEnter = () => {
      isPiPRef.current = true;
      setIsInPiP(true);
    };

    const onLeave = () => {
      isPiPRef.current = false;
      setIsInPiP(false);
      onLeavePiPRestore?.();
    };

    const onWebkitMode = () => {
      const mode = video.webkitPresentationMode;
      const inPiP = mode === "picture-in-picture";
      isPiPRef.current = inPiP;
      setIsInPiP(inPiP);
      if (mode === "inline") onLeavePiPRestore?.();
    };

    video.addEventListener("enterpictureinpicture", onEnter);
    video.addEventListener("leavepictureinpicture", onLeave);
    video.addEventListener("webkitpresentationmodechanged", onWebkitMode);

    return () => {
      video.removeEventListener("enterpictureinpicture", onEnter);
      video.removeEventListener("leavepictureinpicture", onLeave);
      video.removeEventListener("webkitpresentationmodechanged", onWebkitMode);
    };
  }, [videoRef, onLeavePiPRestore]);

  return { isInPiP, isPiPRef, enterPiP, exitPiP };
}