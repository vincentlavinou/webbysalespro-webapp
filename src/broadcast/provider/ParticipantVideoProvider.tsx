'use client'
import { useEffect, useRef, useState } from "react"
import { ParticipantVideoContext } from "../context/ParticipantVideoContext"
import { WebiSalesProParticipant } from "../context/StageContext"

type ParticipantVideoProviderProps = {
    participant: WebiSalesProParticipant,
    children: React.ReactNode
}

export const ParticipantVideoProvider = ({ participant, children }: ParticipantVideoProviderProps) => {

    const screenRef = useRef<HTMLVideoElement>(null);
    const cameraRef = useRef<HTMLVideoElement>(null);

    const [hasScreen, setHasScreen] = useState(false);
    const [screenAspectRatio, setScreenAspectRatio] = useState('aspect-video');

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


    return <ParticipantVideoContext.Provider value={{
        screenShareRef: screenRef,
        cameraRef: cameraRef,
        isScreenShare: hasScreen,
        aspectRatio: screenAspectRatio
    }}>
        {children}
    </ParticipantVideoContext.Provider>
}