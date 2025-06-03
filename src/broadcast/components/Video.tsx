import React from 'react';
import {StageStream, StageParticipantInfo} from 'amazon-ivs-web-broadcast';

interface VideoProps {
  className?: string;
  participant: StageParticipantInfo;
  streamsToDisplay?: StageStream[];
  username?: string;
  participantSize: number | string;
}

const Video: React.FC<VideoProps> = ({
  className,
  participant,
  streamsToDisplay,
  username,
  participantSize,
}) => {
  return (
    <div className="relative">
      <video
        key={participant?.id}
        muted
        autoPlay
        playsInline
        className={className}
        ref={(ref) => {
          if (ref) {
            const mediaStream = new MediaStream();
            streamsToDisplay?.forEach((stream) => {
              mediaStream.addTrack(stream.mediaStreamTrack);
            });
            ref.srcObject = mediaStream;
          }
        }}
      />
      <div className="overlay-pill">
        {username ? username : `user-${participantSize}`}
      </div>
    </div>
  );
};

export default Video;
