'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  participant: import('amazon-ivs-web-broadcast').StageParticipantInfo;
  streams: import('amazon-ivs-web-broadcast').StageStream[];
}

const MainPresenterView = ({ participant, streams }: Props) => {
  const screenRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<HTMLVideoElement>(null);

  const [hasScreen, setHasScreen] = useState(false);
  const [screenAspectRatio, setScreenAspectRatio] = useState('aspect-video');

  useEffect(() => {
    const videoStreams = streams?.filter(
      (stream) => stream.mediaStreamTrack.kind === 'video'
    );

    if (!videoStreams?.length) return;

    let screenTrack: MediaStreamTrack | undefined;
    let cameraTrack: MediaStreamTrack | undefined;

    videoStreams.forEach((stream) => {
      const settings = stream.mediaStreamTrack.getSettings?.();
      if (settings?.displaySurface) {
        screenTrack = stream.mediaStreamTrack;
      } else {
        cameraTrack = stream.mediaStreamTrack;
      }
    });

    // Show screen share if available
    if (screenTrack && screenRef.current) {
      screenRef.current.srcObject = new MediaStream([screenTrack]);
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
    if (cameraTrack && cameraRef.current) {
      cameraRef.current.srcObject = new MediaStream([cameraTrack]);
    }
  }, [participant, streams]);

  return (
    <div className={`relative w-full h-full ${screenAspectRatio} rounded-md border overflow-hidden bg-black`}>
      <video
        ref={hasScreen ? screenRef : cameraRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />

      {/* Picture-in-picture camera if screen sharing is active */}
      {hasScreen && (
        <div className="absolute bottom-3 right-3 w-40 aspect-video border-2 border-white rounded overflow-hidden shadow-lg">
          <video
            ref={cameraRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
};

export default MainPresenterView;
