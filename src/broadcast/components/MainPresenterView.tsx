'use client';

import { useEffect, useRef, useState } from 'react';
import { useStageContext } from '../context';

interface Props {
  participant: import('amazon-ivs-web-broadcast').StageParticipantInfo;
  streams: import('amazon-ivs-web-broadcast').StageStream[];
}

const MainPresenterView = ({ participant, streams }: Props) => {
  const screenRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);

  const [hasScreen, setHasScreen] = useState(false);
  const [screenAspectRatio, setScreenAspectRatio] = useState('aspect-video');
  const {localParticipantRef} = useStageContext()

  useEffect(() => {

    let screenTrack: MediaStreamTrack | undefined;
    let cameraTrack: MediaStreamTrack | undefined;
    let audioTrack: MediaStreamTrack | undefined;
    
    streams.forEach((stream) => {
      const track = stream.mediaStreamTrack;

      if (track.kind === 'audio') {
        audioTrack = track;
      }

      if (track.kind === 'video') {
        const settings = track.getSettings?.();
        console.log("Media Track Settings", settings)
        if (settings?.displaySurface) {
          screenTrack = track;
        } else {
          cameraTrack = track;
        }
      }
    });
    // Show screen share if available
    if (screenTrack && audioTrack && screenRef.current) {
      screenRef.current.srcObject = new MediaStream([screenTrack, audioTrack]);
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
    if (cameraTrack && audioTrack && cameraRef.current) {
      cameraRef.current.srcObject = new MediaStream([cameraTrack, audioTrack]);
    }
  }, [participant, streams]);

  return (
    <div className={`relative w-full h-full ${screenAspectRatio} rounded-md border overflow-hidden bg-black`}>
      <video
        ref={hasScreen ? screenRef : cameraRef}
        autoPlay
        playsInline
        muted={participant.id === localParticipantRef?.current?.id}
        className="w-full h-full object-contain"
      />

      {/* Picture-in-picture camera if screen sharing is active */}
      {hasScreen && (
        <div className="absolute bottom-3 right-3 w-40 aspect-video border-2 border-white rounded overflow-hidden shadow-lg">
          <video
            ref={cameraRef}
            autoPlay
            playsInline
            muted={participant.id === localParticipantRef?.current?.id}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
};

export default MainPresenterView;
