'use client'
import { useEffect, useRef } from "react"
import { useStageContext } from "../hooks/use-stage";
import { Mic, MicOff } from "lucide-react";

interface RemoteVideoCardProps {
  track?: MediaStreamTrack;
  name?: string;
  /** Audio mute status */
  isAudioMuted?: boolean;
  /** Video mute (camera off) status */
  isVideoMuted?: boolean;
}

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
            name={`${participant.attributes["name"] || participant.id}`}
            isAudioMuted={participant.audioMuted}
            isVideoMuted={participant.videoStopped}
          />
        );
      })}
    </div>
  );
};


const RemoteVideoCard = ({
  track,
  name,
  isAudioMuted = false,
  isVideoMuted = false,
}: RemoteVideoCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    // Attach/detach the MediaStream without stopping the remote track
    const stream = track ? new MediaStream([track]) : null;
    videoRef.current.srcObject = stream;

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [track]);

  return (
    <div className="relative w-full aspect-video max-w-[140px] rounded-md border bg-black overflow-hidden shadow-md">
      {/* Hide the video element when video is muted */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${isVideoMuted ? "hidden" : "block"}`}
      />

      {/* Video muted slate */}
      {isVideoMuted && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="text-white text-[11px] font-medium px-2 py-1 rounded bg-black/60 max-w-[90%] truncate">
            {name || "Camera off"}
          </div>
        </div>
      )}

      {/* Mic status badge (top-right) */}
      <div
        className={`absolute top-1 right-1 rounded-full p-1.5 shadow-md ${
          isAudioMuted ? "bg-red-500" : "bg-black/60"
        }`}
        title={isAudioMuted ? "Muted" : "Live mic"}
        aria-label={isAudioMuted ? "Muted" : "Live mic"}
      >
        {isAudioMuted ? (
          <MicOff className="h-3.5 w-3.5 text-white" />
        ) : (
          <Mic className="h-3.5 w-3.5 text-white" />
        )}
      </div>

      {/* Name label (bottom-left) only when video is visible */}
      {!isVideoMuted && name && (
        <div className="absolute bottom-0 left-0 text-white text-[10px] bg-black/60 px-1 py-0.5 w-full truncate">
          {name}
        </div>
      )}
    </div>
  );
};

export default RemoteParticipantVideos;
