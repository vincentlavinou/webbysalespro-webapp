"use client";
import { useState, useEffect, useRef } from "react";
import Script from "next/script";

import {
  getDevices,
  handleMediaToggle,
  MIC,
  CAMERA,
} from "@/broadcast/utils/mediadevices";
import {
  leaveStage,
  joinStage,
  createLocalStageStream,
} from "@/broadcast/utils/stage";

import Header from "@/broadcast/components/Header";
import Input from "@/broadcast/components/Input";
import LocalParticipantVideo from "@/broadcast/components/LocalParticipantVideo";
import RemoteParticipantVideos from "@/broadcast/components/RemoteParticipantVideo";
import Select from "@/broadcast/components/Select";

import {StageStream, StageParticipantInfo} from 'amazon-ivs-web-broadcast';

type LocalParticipant = {
  participant: StageParticipantInfo;
  streams: StageStream[];
};

export default function Home() {
  const [isInitializeComplete, setIsInitializeComplete] = useState<boolean>(false);

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string | null>(null);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string | null>(null);
  const [participantToken, setParticipantToken] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [participants, setParticipants] = useState<LocalParticipant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | any>({});
  const stageRef = useRef<any>(undefined);
  const strategyRef = useRef<any>(undefined);
  const [isMicMuted, setIsMicMuted] = useState<boolean>(true);
  const [isCameraHidden, setIsCameraHidden] = useState<boolean>(false);

  const handleDeviceUpdate = async () => {
    try {
      const { videoDevices, audioDevices } = await getDevices();
      setVideoDevices(videoDevices);
      setSelectedVideoDeviceId(videoDevices[0]?.deviceId || null);

      setAudioDevices(audioDevices);
      setSelectedAudioDeviceId(audioDevices[0]?.deviceId || null);
    } catch (error) {
      console.error("An error occurred during device update:", error);
    }
  };

  const initialize = async () => {
    handleDeviceUpdate();
    setIsInitializeComplete(true);
  };

  const updateLocalParticipantMedia = async () => {
    const { participant } = localParticipant;
    const newVideoStream = await createLocalStageStream(selectedVideoDeviceId, CAMERA);
    const newAudioStream = await createLocalStageStream(selectedAudioDeviceId, MIC);
    const updatedStreams = [newVideoStream, newAudioStream];

    const updatedParticipant = {
      participant,
      streams: updatedStreams,
    };

    setLocalParticipant(updatedParticipant);
    strategyRef.current.updateTracks(newAudioStream, newVideoStream);
    stageRef.current.refreshStrategy();
  };

  useEffect(() => {
    const isInitializingStreams =
      !strategyRef.current?.audioTrack && !strategyRef.current?.videoTrack;
    if (!isInitializeComplete || isInitializingStreams) return;

    if (localParticipant.streams) {
      updateLocalParticipantMedia();
    }
  }, [selectedVideoDeviceId, selectedAudioDeviceId]);

  return (
    <div>
      <Script
        src="https://web-broadcast.live-video.net/1.6.0/amazon-ivs-web-broadcast.js"
        onLoad={initialize}
      ></Script>
      <Header />
      <hr />
      <div className="row">
        <Select
          deviceType="Camera"
          updateDevice={setSelectedVideoDeviceId}
          devices={videoDevices}
        />
        <Select
          deviceType="Microphone"
          updateDevice={setSelectedAudioDeviceId}
          devices={audioDevices}
        />
        <Input
          label="Participant Token"
          value={participantToken}
          onChange={setParticipantToken}
        />
        {isInitializeComplete && (
          <div className="button-container row">
            <button
              className="button"
              onClick={() =>
                joinStage(
                  isInitializeComplete,
                  participantToken,
                  selectedAudioDeviceId,
                  selectedVideoDeviceId,
                  setIsConnected,
                  setIsMicMuted,
                  setLocalParticipant,
                  setParticipants,
                  strategyRef,
                  stageRef
                )
              }
            >
              Join Stage
            </button>
            <button
              className="button"
              onClick={() => leaveStage(setIsConnected, stageRef.current)}
            >
              Leave Stage
            </button>
          </div>
        )}
        <br />
      </div>
      {isConnected && (
        <>
          <h3>Local Participant</h3>
          <LocalParticipantVideo
            localParticipantInfo={localParticipant}
            isInitializeComplete={isInitializeComplete}
            participantSize={participants.length}
          />
        </>
      )}
      {isConnected && (
        <div className="static-controls">
          <button
            onClick={() => handleMediaToggle(MIC, stageRef, setIsMicMuted)}
            className="button"
          >
            {isMicMuted ? "Unmute Mic" : "Mute Mic"}
          </button>
          <button
            onClick={() => handleMediaToggle(CAMERA, stageRef, setIsCameraHidden)}
            className="button"
          >
            {isCameraHidden ? "Unhide Camera" : "Hide Camera"}
          </button>
        </div>
      )}
      {isConnected && (
        <>
          <h3>Remote Participants</h3>{" "}
          <div className="center">
            <RemoteParticipantVideos
              isInitializeComplete={isInitializeComplete}
              participants={participants}
            />
          </div>
        </>
      )}
    </div>
  );
}
