import React from 'react';
import Video from './Video';

import {StreamType, StageStream, StageParticipantInfo} from 'amazon-ivs-web-broadcast';

type LocalParticipantInfo = {
  participant: StageParticipantInfo;
  streams: StageStream[];
};

interface LocalParticipantVideoProps {
  isInitializeComplete: boolean;
  localParticipantInfo: LocalParticipantInfo;
  participantSize: number | string;
}

const LocalParticipantVideo: React.FC<LocalParticipantVideoProps> = ({
  isInitializeComplete,
  localParticipantInfo,
  participantSize,
}) => {
  if (!isInitializeComplete) return null; // TS requires a valid return (not just `return;`)

  const { participant, streams } = localParticipantInfo;
  const { username } = participant?.attributes || {};

  const streamsToDisplay = streams?.filter(
    (stream) => stream?.streamType === StreamType?.VIDEO
  );

  return (
    <div className="video-container">
      <div className="column">
        <Video
          className="local-video"
          participant={participant}
          streamsToDisplay={streamsToDisplay}
          username={username as string || `user-${participantSize}`}
          participantSize={participantSize}
        />
      </div>
    </div>
  );
};

export default LocalParticipantVideo;