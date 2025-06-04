"use client";

import { useState } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Header from "@broadcast/components/Header";
import Select from "@broadcast/components/Select";
import LocalParticipantVideo from "@broadcast/components/LocalParticipantVideo";
import RemoteParticipantVideos from "@broadcast/components/RemoteParticipantVideos";
import { StageProvider, useStageContext } from "@broadcast/context";
import { useMediaDevices } from "@broadcast/hooks";
import { toggleMedia } from "@broadcast/service/utils";
import { DeviceType } from "@broadcast/service/enum";

interface BroadcastUIProps {
    token: string
}

const BroadcastUI = ({token}: BroadcastUIProps) => {
  const { isConnected, localParticipant, participants, join, leave, stageRef, localParticipantRef } = useStageContext();
  const { videoDevices, audioDevices, videoId, audioId, setVideoId, setAudioId } = useMediaDevices();
  const [isMicMuted, setIsMicMuted] = useState(true);
  const [isCamHidden, setIsCamHidden] = useState(false);

  return (
    <div>
      <Script src="https://web-broadcast.live-video.net/1.6.0/amazon-ivs-web-broadcast.js" />
      <Header />
      <Card className="p-6 shadow-sm border rounded-xl max-w-5xl mx-auto mt-6 bg-white">
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
          <div className="space-y-4">
            <Select deviceType="Camera" updateDevice={setVideoId} devices={videoDevices} />
            <Select deviceType="Microphone" updateDevice={setAudioId} devices={audioDevices} />
            <div className="flex gap-2">
              <Button onClick={() => join(token, audioId, videoId)}>Join Stage</Button>
              <Button variant="outline" onClick={leave}>Leave</Button>
            </div>
            {isConnected && stageRef && (
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={() => toggleMedia(DeviceType.MIC, setIsMicMuted, localParticipantRef)}>
                  {isMicMuted ? "Unmute Mic" : "Mute Mic"}
                </Button>
                <Button variant="secondary" onClick={() => toggleMedia(DeviceType.CAMERA, setIsCamHidden, localParticipantRef)}>
                  {isCamHidden ? "Unhide Camera" : "Hide Camera"}
                </Button>
              </div>
            )}
          </div>
          <div>
            {isConnected && localParticipant && (
              <LocalParticipantVideo localParticipantInfo={localParticipant} />
            )}
          </div>
        </div>
        {isConnected && (
          <div className="pt-6">
            <h3 className="text-lg font-semibold">Remote Participants</h3>
            <RemoteParticipantVideos isInitializeComplete={true} participants={participants} />
          </div>
        )}
      </Card>
    </div>
  );
};

interface LiveBroadcastProps {
    accessToken: string
}

export function TestBroadcast(props: LiveBroadcastProps) {
  return (
    <StageProvider>
      <BroadcastUI token={props.accessToken}/>
    </StageProvider>
  );
}
