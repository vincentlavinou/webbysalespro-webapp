'use client'
import { useEffect, useRef } from "react"

interface Props {
  isInitializeComplete: boolean;
  participants: {
    participant: import("amazon-ivs-web-broadcast").StageParticipantInfo;
    streams: import("amazon-ivs-web-broadcast").StageStream[];
  }[];
}

const RemoteParticipantVideos = ({ isInitializeComplete, participants }: Props) => {
  if (!isInitializeComplete) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {participants.map(({ participant, streams }) => {
        const videoStream = streams.find(
          (stream) => stream.mediaStreamTrack.kind === "video"
        );

        return (
          <RemoteVideoCard
            key={participant.id}
            track={videoStream?.mediaStreamTrack}
            name={participant.id}
          />
        );
      })}
    </div>
  );
};

const RemoteVideoCard = ({
  track,
  name,
}: {
  track?: MediaStreamTrack;
  name?: string;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (track && videoRef.current) {
      const stream = new MediaStream([track]);
      videoRef.current.srcObject = stream;
    }
  }, [track]);

  return (
    <div className="relative rounded-md border bg-black overflow-hidden aspect-video">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      {name && (
        <div className="text-white text-xs bg-black/60 px-2 py-1 absolute bottom-0 left-0">
          {name}
        </div>
      )}
    </div>
  );
};

export default RemoteParticipantVideos;
