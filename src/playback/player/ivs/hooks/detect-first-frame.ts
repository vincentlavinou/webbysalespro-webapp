"use client";

type RvfcVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (
    cb: (now: number, metadata?: { presentedFrames?: number }) => void,
  ) => number;
  cancelVideoFrameCallback?: (id: number) => void;
  getVideoPlaybackQuality?: () => { totalVideoFrames?: number };
  webkitDecodedFrameCount?: number;
  webkitPresentedFrameCount?: number;
  mozPresentedFrames?: number;
  msDecodedFrameCount?: number;
};

function getPresentedFrameCount(video: HTMLVideoElement): number {
  const rvfcVideo = video as RvfcVideo;

  try {
    const quality = rvfcVideo.getVideoPlaybackQuality?.();
    if (typeof quality?.totalVideoFrames === "number") {
      return quality.totalVideoFrames;
    }
  } catch {}

  if (typeof rvfcVideo.webkitPresentedFrameCount === "number") {
    return rvfcVideo.webkitPresentedFrameCount;
  }

  if (typeof rvfcVideo.webkitDecodedFrameCount === "number") {
    return rvfcVideo.webkitDecodedFrameCount;
  }

  if (typeof rvfcVideo.mozPresentedFrames === "number") {
    return rvfcVideo.mozPresentedFrames;
  }

  if (typeof rvfcVideo.msDecodedFrameCount === "number") {
    return rvfcVideo.msDecodedFrameCount;
  }

  return 0;
}

export function detectFirstFrame(
  video: HTMLVideoElement,
  onFrame: () => void,
): () => void {
  let done = false;
  let rvfcHandle: number | undefined;
  const startTime = video.currentTime;
  const startFrames = getPresentedFrameCount(video);

  const isFramePainted = () =>
    video.readyState >= 2 &&
    video.videoWidth > 0 &&
    video.videoHeight > 0 &&
    !video.paused &&
    (
      getPresentedFrameCount(video) > startFrames ||
      Math.abs(video.currentTime - startTime) > 0.01 ||
      video.currentTime > 0.01
    );

  const fire = () => {
    if (done) return;
    done = true;
    cleanup();
    onFrame();
  };

  const maybeFire = () => {
    if (done) return;
    if (isFramePainted()) fire();
  };

  const cleanup = () => {
    const rvfcVideo = video as RvfcVideo;
    if (
      rvfcHandle !== undefined &&
      typeof rvfcVideo.cancelVideoFrameCallback === "function"
    ) {
      try {
        rvfcVideo.cancelVideoFrameCallback(rvfcHandle);
      } catch {}
    }
    clearInterval(pollHandle);
    video.removeEventListener("loadeddata", maybeFire);
    video.removeEventListener("playing", maybeFire);
    video.removeEventListener("timeupdate", maybeFire);
    video.removeEventListener("canplay", maybeFire);
  };

  const rvfcVideo = video as RvfcVideo;
  if (typeof rvfcVideo.requestVideoFrameCallback === "function") {
    const requestFrame = () => {
      rvfcHandle = rvfcVideo.requestVideoFrameCallback?.((_now, metadata) => {
        if (done) return;

        const frameCount =
          typeof metadata?.presentedFrames === "number"
            ? metadata.presentedFrames
            : getPresentedFrameCount(video);

        if (
          video.readyState >= 2 &&
          video.videoWidth > 0 &&
          video.videoHeight > 0 &&
          !video.paused &&
          (
            frameCount > startFrames ||
            Math.abs(video.currentTime - startTime) > 0.01 ||
            video.currentTime > 0.01
          )
        ) {
          fire();
          return;
        }

        requestFrame();
      });
    };

    requestFrame();
  }

  video.addEventListener("loadeddata", maybeFire);
  video.addEventListener("playing", maybeFire);
  video.addEventListener("timeupdate", maybeFire);
  video.addEventListener("canplay", maybeFire);
  const pollHandle = setInterval(maybeFire, 250);

  maybeFire();
  return cleanup;
}
