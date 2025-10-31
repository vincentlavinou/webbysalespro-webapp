'use client';

import { useStageContext } from '../../hooks/use-stage';
import { WebiSalesProParticipant } from '../../context/StageContext';
import { useParticipantVideo } from '../../hooks/use-participant-video';
import { ParticipantVideoProvider } from '../../provider/ParticipantVideoProvider';

export interface VideoCardProps {
  participant: WebiSalesProParticipant
}


const MainPresenterView = ({ participant}: VideoCardProps) => {

  return (
    <ParticipantVideoProvider participant={participant}>
      <MainVideoCard participant={participant}/>
    </ParticipantVideoProvider>
  );
};

const MainVideoCard = ({
  participant
} : VideoCardProps) => {
  
  const { screenShareRef, cameraRef, isScreenShare, aspectRatio } = useParticipantVideo()
  const {localParticipantRef} = useStageContext()

  return (
    <div className={`w-full max-h-[80vh] ${aspectRatio} rounded-md border overflow-hidden relative bg-black group cursor-pointer`}>
      <video
        ref={isScreenShare ? screenShareRef : cameraRef}
        autoPlay
        playsInline
        muted={participant.participant.id === localParticipantRef?.current?.id}
        className="w-full h-full object-contain"
      />

      {/* Picture-in-picture camera if screen sharing is active */}
      {isScreenShare && (
        <div className="absolute bottom-3 right-3 w-40 aspect-video border-2  rounded overflow-hidden shadow-lg">
          <video
            ref={cameraRef}
            autoPlay
            playsInline
            muted={participant.participant.id === localParticipantRef?.current?.id}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
};

export default MainPresenterView;
