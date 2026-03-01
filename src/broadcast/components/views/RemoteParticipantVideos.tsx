'use client'
import { useStageContext } from "../../hooks/use-stage";
import { Mic, MicOff } from "lucide-react";
import { ParticipantVideoProvider } from "../../provider/ParticipantVideoProvider";
import { useParticipantVideo } from "../../hooks/use-participant-video";
import { VideoCardProps } from "./MainPresenterView";
import { usePresentation } from "../../hooks/use-presentation";
import { useEffect, useState } from "react";
import { WebiSalesProParticipant } from "../../context/StageContext";
import { useVideoInjection } from "@/broadcast/hooks/use-video-injection";


interface Props {
  role: 'host' | 'presenter' | 'attendee'
  isInitializeComplete: boolean;
}

const RemoteParticipantVideos = ({ isInitializeComplete, role }: Props) => {

  const { mainParticiant, participants } = useStageContext()
  const [updatedParticipants, setUpdatedParticipants] = useState<WebiSalesProParticipant[]>([])
  const { isActive: presentationIsActive } = usePresentation()
  const { isActive: videoInjectionIsActive } = useVideoInjection()

  useEffect(() => {
    if (presentationIsActive || videoInjectionIsActive) {
      setUpdatedParticipants(participants)
    } else {
      setUpdatedParticipants(participants.filter((participant) => participant.participant.id !== mainParticiant?.participant.id))
    }

  }, [participants, presentationIsActive, videoInjectionIsActive, mainParticiant?.participant.id])

  if (!isInitializeComplete || role === 'attendee') return null;

  return (
    <div className="flex flex-col gap-3">
      {updatedParticipants.map((participant) => {
        return (
          <ParticipantVideoProvider participant={participant} key={participant.participant.id}>
            <RemoteVideoCard
              participant={participant}
            />
          </ParticipantVideoProvider>
        );
      })}
    </div>
  );
};


const RemoteVideoCard = ({
  participant
}: VideoCardProps) => {
  const name = participant.participant.attributes["name"] as string || participant.participant.id
  const { localParticipantRef } = useStageContext()
  const { screenShareRef, cameraRef, isScreenShare, aspectRatio } = useParticipantVideo()


  return (
    <div className={`relative w-full ${aspectRatio} max-w-[140px] rounded-md border bg-black overflow-hidden shadow-md`}>
      {/* Hide the video element when video is muted */}
      <video
        ref={isScreenShare ? screenShareRef : cameraRef}
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
