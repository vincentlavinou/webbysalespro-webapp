"use client";

import Script from "next/script";
import Header from "@broadcast/components/Header";
import RemoteParticipantVideos from "@broadcast/components/RemoteParticipantVideos";
import { StageProvider, useStageContext } from "@broadcast/context";
import { HostNotStarted } from "./HostNotStarted";
import { LocalMediaDeviceProvider } from "../provider/LocalMediaDeviceProvider";
import { LocalMediaProvider } from "../provider/LocalMediaProvider";
import { useRef } from "react";
import { LocalMediaControl } from "./LocalMediaControl";
import { BroadcastServiceToken } from "../service/type";
import { BroadcastServiceProvider } from "../provider/BroadcastServiceProvider";
import MainPresenterView from "@/broadcast/components/MainPresenterView";
import { WebinarChat } from "@/chat/component";

type Stage = import("amazon-ivs-web-broadcast").Stage;

interface BroadcastUIProps {
    token: BroadcastServiceToken
}

const BroadcastUI = ({token}: BroadcastUIProps) => {
  const { isConnected, mainParticiant, participants, join } = useStageContext();
  
  return (
    <div className="flex flex-col w-full h-[90vh] overflow-hidden px-4">
      <Script src="https://web-broadcast.live-video.net/1.6.0/amazon-ivs-web-broadcast.js" />
      {token.role === 'host' && <Header />}

      {/* Main area */}
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden">
        {/* Remote Participants (top scrollable row on mobile) */}
        {isConnected && participants.length > 0 && (
          <div className="w-full lg:w-[160px] flex flex-row lg:flex-col items-center gap-2 overflow-x-auto lg:overflow-y-auto p-2">
            <RemoteParticipantVideos
              role={token.role}
              isInitializeComplete={true}
            />
          </div>
        )}

        {/* Video + Controls */}
        <div className="h-[80vh]flex flex-col flex-1 min-w-0 min-h-0 p-4 gap-4 overflow-hidden">
          {/* Video */}
          {/* Controls under video (always visible) */}
          <div className="hidden md:block pb-6">
            <LocalMediaControl />
          </div>
          <div className="flex-1 overflow-hidden">
            {isConnected && mainParticiant ? (
              <MainPresenterView participant={mainParticiant.participant} streams={mainParticiant.streams} />
            ) : (
              <HostNotStarted onStart={() => join(token.stream_token)} />
            )}
          </div>

          {/* Controls under video (always visible) */}
          <div className="md:hidden pt-4 border-t">
            <LocalMediaControl />
          </div>
        </div>

        {/* Chat */}
        <div className="w-full lg:pt-18 lg:w-[320px] min-w-[280px] lg:max-w-[400px] h-[300px] lg:h-full flex flex-col overflow-auto">
          <WebinarChat region={token.region}/>
        </div>
      </div>
    </div>

  );
};

interface LiveBroadcastProps {
    session: string
    token: BroadcastServiceToken
}

export function TestBroadcast(props: LiveBroadcastProps) {

    const stageRef = useRef<Stage | undefined>(undefined);

  return (
    <BroadcastServiceProvider token={props.token} session={props.session}>
      <LocalMediaDeviceProvider>
        <LocalMediaProvider stageRef={stageRef}>
          <StageProvider stageRef={stageRef}>
            <BroadcastUI token={props.token} />
          </StageProvider>
        </LocalMediaProvider>
      </LocalMediaDeviceProvider>
    </BroadcastServiceProvider>


  );
}
