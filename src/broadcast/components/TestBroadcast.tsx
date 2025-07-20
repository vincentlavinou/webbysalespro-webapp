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
  token: BroadcastServiceToken;
  title?: string;
}

const BroadcastUI = ({ token, title }: BroadcastUIProps) => {
  const { isConnected, mainParticiant, participants, join } = useStageContext();

  return (
    <div className="flex flex-col w-full h-[90vh] overflow-hidden md:px-4">
      <Script src="https://web-broadcast.live-video.net/1.6.0/amazon-ivs-web-broadcast.js" />
      {token.role === "host" && <Header />}

      {/* Main area layout: stacked on mobile, side-by-side on desktop */}
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden">

        {/* Remote Participants */}
        {isConnected && participants.length > 0 && (
          <div className="w-full lg:w-[160px] flex flex-row lg:flex-col items-center gap-2 overflow-x-auto lg:overflow-y-auto p-2">
            <RemoteParticipantVideos role={token.role} isInitializeComplete={true} />
          </div>
        )}

        {/* Video + Controls + Chat container (stacked on mobile) */}
        <div className="flex flex-col flex-1 min-h-0 lg:flex-row overflow-hidden gap-2">

          {/* Video + Controls (fixed above chat) */}
          <div className="flex flex-col w-full lg:flex-1 max-h-[calc(100vh-100px)] min-h-0">
            {/* Video sticky at top */}
            <div className="sticky top-0 z-10 bg-black">
              {isConnected && mainParticiant ? (
                <MainPresenterView
                  participant={mainParticiant.participant}
                  streams={mainParticiant.streams}
                />
              ) : (
                <HostNotStarted onStart={() => join(token.stream_token)} />
              )}
            </div>

            {/* Controls below video (mobile) */}
            <div className="pt-2 border-t px-2 md:hidden">
              <LocalMediaControl title={title} />
            </div>

            {/* Controls (desktop) */}
            <div className="hidden md:block pb-2 ">
              <LocalMediaControl title={title} />
            </div>
          </div>

          {/* Chat container (grows under controls) */}
          <div className="flex flex-col w-full lg:w-[320px] min-w-[280px] lg:max-w-[400px] flex-1 overflow-y-auto px-2">
            <WebinarChat region={token.region} />
          </div>
        </div>
      </div>
    </div>
  );
};

interface LiveBroadcastProps {
  session: string;
  token: BroadcastServiceToken;
  title?: string;
}

export function TestBroadcast(props: LiveBroadcastProps) {
  const stageRef = useRef<Stage | undefined>(undefined);

  return (
    <BroadcastServiceProvider token={props.token}>
      <LocalMediaDeviceProvider>
        <LocalMediaProvider stageRef={stageRef}>
          <StageProvider stageRef={stageRef}>
            <BroadcastUI token={props.token} title={props.title} />
          </StageProvider>
        </LocalMediaProvider>
      </LocalMediaDeviceProvider>
    </BroadcastServiceProvider>
  );
}
