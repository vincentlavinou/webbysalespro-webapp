import React from 'react';
import Video from './Video';
import { StageStream, StageParticipantInfo } from 'amazon-ivs-web-broadcast';

interface ParticipantAndStreamInfo {
  participant: StageParticipantInfo;
  streams: StageStream[];
}

interface RemoteParticipantVideosProps {
  isInitializeComplete: boolean;
  participants: ParticipantAndStreamInfo[];
}

const RemoteParticipantVideos: React.FC<RemoteParticipantVideosProps> = ({
  isInitializeComplete,
  participants,
}) => {
  if (!isInitializeComplete) return null;

  return (
    <>
      {participants
        ?.filter(({ participant }) => !participant.isLocal)
        .map(({ participant, streams }, index) => {
          const { username } = participant?.attributes || {};

          return (
            <div className="flex margin" key={participant.id}>
              <div className="video-container">
                <Video
                  className="remote-participant-video"
                  participant={participant}
                  streamsToDisplay={streams}
                  username={username as string || `user-${index + 1}`}
                  participantSize={index + 1}
                />
              </div>
            </div>
          );
        })}
    </>
  );
};

export default RemoteParticipantVideos;
