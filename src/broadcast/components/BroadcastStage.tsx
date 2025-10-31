"use client";

import Script from "next/script";
import Header from "@broadcast/components/Header";
import RemoteParticipantVideos from "@/broadcast/components/views/RemoteParticipantVideos";
import { HostNotStarted } from "./HostNotStarted";
import { LocalMediaControl } from "./LocalMediaControl";
import { BroadcastServiceToken } from "../service/type";
import MainPresenterView from "@/broadcast/components/views/MainPresenterView";
import { WebinarChat } from "@/chat/component";
import { useStageContext } from "../hooks/use-stage";
import { usePresentation } from "../hooks/use-presentation";
import { PresentationView } from "./views/PresentationView";
import { useVideoInjection } from "../hooks/use-video-injection";
import { VideoInjectionView } from "./views/VideoInjectionView";

interface BroadcastUIProps {
  token: BroadcastServiceToken;
  title?: string;
}

export const BroadcastStage = ({ token, title }: BroadcastUIProps) => {
  const { isConnected, mainParticiant, participants, join } = useStageContext();
  const {isActive: presentationIsActive, selectedPresentation} = usePresentation()
  const {isActive: videoInjectionIsActive, selectedVideoInjection} = useVideoInjection()

  const sideLayout = () => {
    if(isConnected) {
      if(presentationIsActive || videoInjectionIsActive) {
        return <RemoteParticipantVideos role={token.role} isInitializeComplete={true} />
      } else if(participants.length > 1) {
        return <RemoteParticipantVideos role={token.role} isInitializeComplete={true} />
      }
    }
  }

  const mainLayout = () => {
    if(isConnected) {
      if(presentationIsActive && selectedPresentation?.download_url) {
        return <PresentationView presentation={{
          downloadUrl: selectedPresentation.download_url,
          active: selectedPresentation?.is_active
        }}/>
      } else if(videoInjectionIsActive && selectedVideoInjection) {
        return <VideoInjectionView injection={selectedVideoInjection}/>
      } 
      else if(mainParticiant) {
        return <MainPresenterView participant={mainParticiant} />
      }
    } else {
      return <HostNotStarted onStart={() => join(token.stream_token)} />
    }
  }

  return (
    <div className="flex flex-col w-full h-[90vh] overflow-hidden md:px-4">
      <Script src="https://web-broadcast.live-video.net/1.6.0/amazon-ivs-web-broadcast.js" />
      {token.role === "host" && <Header />}

      {/* Main area layout: stacked on mobile, side-by-side on desktop */}
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden">

        {/* Remote Participants */}
        {sideLayout()}

        {/* Video + Controls + Chat container (stacked on mobile) */}
        <div className="flex flex-col flex-1 min-h-0 lg:flex-row overflow-hidden gap-2">

          {/* Video + Controls (fixed above chat) */}
          <div className="flex flex-col w-full lg:flex-1 max-h-[calc(100vh-100px)] min-h-0">
            {/* Video sticky at top */}
            <div className="sticky top-0 z-10 bg-black">
              {mainLayout()}
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