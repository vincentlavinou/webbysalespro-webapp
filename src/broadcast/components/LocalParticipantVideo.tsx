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

  useEffect(() => {
    const videoStream = localParticipantInfo.streams?.find(
      (stream) => stream.mediaStreamTrack.kind === "video"
    );
    if (videoStream && videoRef.current) {
      const mediaStream = new MediaStream([videoStream.mediaStreamTrack]);
      videoRef.current.srcObject = mediaStream;
    }
  }, [localParticipantInfo]);

  return (
    <div className="rounded-lg overflow-hidden border w-full aspect-video bg-black">
      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
    </div>
  );
};

export default LocalParticipantVideo;
