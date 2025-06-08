'use client'
import { useEffect, useRef, useState } from "react"

interface Props {
  localParticipantInfo: {
    participant: import("amazon-ivs-web-broadcast").StageParticipantInfo;
    streams: import("amazon-ivs-web-broadcast").StageStream[];
  };
}

const LocalParticipantVideo = ({ localParticipantInfo }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [aspectRatio, setAspectRatio] = useState("aspect-video");

  useEffect(() => {
    const videoStream = localParticipantInfo.streams?.find(
      (stream) => stream.mediaStreamTrack.kind === "video"
    );

    if (videoStream && videoRef.current) {
      const mediaStream = new MediaStream([videoStream.mediaStreamTrack]);
      videoRef.current.srcObject = mediaStream;

      const settings = videoStream.mediaStreamTrack.getSettings?.();
      const { width, height } = settings || {};

      if (width && height) {
        const ratio = width / height;
        if (Math.abs(ratio - 4 / 3) < 0.1) setAspectRatio("aspect-[4/3]");
        else if (Math.abs(ratio - 16 / 9) < 0.1) setAspectRatio("aspect-video");
        else setAspectRatio("aspect-auto");
      }
    }
  }, [localParticipantInfo]);

  return (
    <div className={`w-full max-w-md ${aspectRatio} rounded-md border overflow-hidden bg-black`}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default LocalParticipantVideo;
