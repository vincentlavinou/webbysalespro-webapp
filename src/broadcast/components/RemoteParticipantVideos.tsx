'use client'
import { useEffect, useRef, useState } from "react"
import { useStageContext } from "../hooks/use-stage";
import { Mic, MicOff } from "lucide-react";
import { WebiSalesProParticipant } from "../context/StageContext";

interface RemoteVideoCardProps {
  participant: WebiSalesProParticipant
}

interface Props {
  role: 'host' | 'presenter' | 'attendee'
  isInitializeComplete: boolean;
}

const RemoteParticipantVideos = ({ isInitializeComplete, role }: Props) => {

  const { mainParticiant, participants } = useStageContext()

  if (!isInitializeComplete || role === 'attendee') return null;

  return (
    <div className="flex flex-col gap-3">
      {participants.filter((participant) => participant.participant.id !== mainParticiant?.participant.id).map((participant) => {
        return (
          <RemoteVideoCard
            key={participant.participant.id}
            participant={participant}
          />
        );
      })}
    </div>
  );
};


const RemoteVideoCard = ({
  participant
}: RemoteVideoCardProps) => {
  const name = participant.participant.attributes["name"] as string || participant.participant.id
  const screenRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);

  const [hasScreen, setHasScreen] = useState(false);
  const [screenAspectRatio, setScreenAspectRatio] = useState('aspect-video');
  const { localParticipantRef } = useStageContext()

  const audioRef = useRef<MediaStreamTrack | undefined>(undefined)
  const videoRef = useRef<MediaStreamTrack | undefined>(undefined)


  useEffect(() => {

    let screenTrack: MediaStreamTrack | undefined;
    let cameraTrack: MediaStreamTrack | undefined;
    let audioTrack: MediaStreamTrack | undefined;

    participant.streams.forEach((stream) => {
      const track = stream.mediaStreamTrack;

      if (track.kind === 'audio') {
        audioTrack = track;
        audioRef.current = audioTrack
      }

      if (track.kind === 'video') {
        const settings = track.getSettings?.();
        if (settings?.displaySurface) {
          screenTrack = track;
        } else {
          cameraTrack = track;
        }
        videoRef.current = track
      }
    });
    // Show screen share if available
    if (screenTrack && audioRef.current && screenRef.current) {
      screenRef.current.srcObject = new MediaStream([screenTrack, audioRef.current]);
      setHasScreen(true);

      const { width, height } = screenTrack.getSettings?.() || {};
      if (width && height) {
        const ratio = width / height;
        if (Math.abs(ratio - 4 / 3) < 0.1) setScreenAspectRatio("aspect-[4/3]");
        else if (Math.abs(ratio - 16 / 9) < 0.1) setScreenAspectRatio("aspect-video");
        else setScreenAspectRatio("aspect-auto");
      }
    }

    // Always attach camera if available
    if (cameraTrack && audioRef.current && cameraRef.current) {
      cameraRef.current.srcObject = new MediaStream([cameraTrack, audioRef.current]);
    }
  }, [participant]);

  return (
    <div className={`relative w-full ${screenAspectRatio} max-w-[140px] rounded-md border bg-black overflow-hidden shadow-md`}>
      {/* Hide the video element when video is muted */}
      <video
        ref={hasScreen ? screenRef : cameraRef}
        autoPlay
        playsInline
        muted={participant.participant.id === localParticipantRef?.current?.id}
        className={`w-full h-full object-cover ${participant.participant.videoStopped ? "hidden" : "block"}`}
      />

      {/* Video muted slate */}
      {participant.participant.videoStopped && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="text-white text-[11px] font-medium px-2 py-1 rounded bg-black/60 max-w-[90%] truncate">
            {name || "Camera off"}
          </div>
        </div>
      )}

      {/* Mic status badge (top-right) */}
      <div
        className={`absolute top-1 right-1 rounded-full p-1.5 shadow-md ${participant.participant.audioMuted ? "bg-red-500" : "bg-black/60"
          }`}
        title={participant.participant.audioMuted ? "Muted" : "Live mic"}
        aria-label={participant.participant.audioMuted ? "Muted" : "Live mic"}
      >
        {participant.participant.audioMuted ? (
          <MicOff className="h-3.5 w-3.5 text-white" />
        ) : (
          <Mic className="h-3.5 w-3.5 text-white" />
        )}
      </div>

      {/* Name label (bottom-left) only when video is visible */}
      {!participant.participant.audioMuted && name && (
        <div className="absolute bottom-0 left-0 text-white text-[10px] bg-black/60 px-1 py-0.5 w-full truncate">
          {name}
        </div>
      )}
    </div>
  );
};

export default RemoteParticipantVideos;
