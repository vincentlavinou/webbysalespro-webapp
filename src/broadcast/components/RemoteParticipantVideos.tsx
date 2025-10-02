'use client'
import { useEffect, useRef } from "react"
import { useStageContext } from "../hooks/use-stage";

interface Props {
  role: 'host' | 'presenter' | 'attendee'
  isInitializeComplete: boolean;
}

const RemoteParticipantVideos = ({ isInitializeComplete, role }: Props) => {

  const { mainParticiant, participants} = useStageContext()

  if (!isInitializeComplete || role === 'attendee') return null;

  return (
    <div className="flex flex-col gap-3">
      {participants.filter((participant) => participant.participant.id !== mainParticiant?.participant.id).map(({ participant, streams }) => {
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
    <div className="relative w-full aspect-video max-w-[140px] rounded-md border bg-black overflow-hidden shadow-md">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      {name && (
        <div className="absolute bottom-0 left-0 text-white text-[10px] bg-black/60 px-1 py-0.5 w-full truncate">
          {name}
        </div>
      )}
    </div>
  );
};

export default RemoteParticipantVideos;
