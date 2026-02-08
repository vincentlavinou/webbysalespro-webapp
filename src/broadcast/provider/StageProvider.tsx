'use client'

import {
  useState,
  useRef,
  useCallback,
  ReactNode,
  RefObject,
  useEffect,
} from "react";

import {
  equalsWebiSalesProParticipant,
  joinStage,
  leaveStage
} from "@broadcast/service/utils";
import { useLocalMedia } from "../hooks/use-strategy";
import { useBroadcastService } from "../hooks/use-broadcast-service";
import { sessionController } from "../service";
import { useBroadcastConfiguration } from "../hooks";
import { useRouter } from "next/navigation";
import { StageContext, WebiSalesProParticipant } from "../context/StageContext";
import { useMediaStrategy } from "../hooks/use-media-strategy";
import { LocalStreamEvent } from "../service/type";

// ✅ Use type-only imports to avoid SSR errors
type Stage = import("amazon-ivs-web-broadcast").Stage;
type StageParticipantInfo = import("amazon-ivs-web-broadcast").StageParticipantInfo;

interface StageProviderProps {
  children: ReactNode,
  stageRef: RefObject<Stage | undefined>
  isViewer: boolean
  onStreamEvent: (event: LocalStreamEvent) => void
}

export const StageProvider = ({ children, stageRef, onStreamEvent, isViewer }: StageProviderProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [mainParticiant, setMainParticipant] = useState<WebiSalesProParticipant | undefined>(undefined);
  const [participants, setParticipants] = useState<WebiSalesProParticipant[]>([]);
  
  const { strategy } = useMediaStrategy()
  const { create: createLocalMedia } = useLocalMedia()
  const { mainPresenterId } = useBroadcastService()
  const {sessionId, seriesId, getRequestHeaders} = useBroadcastConfiguration()

  const localParticipantRef = useRef<StageParticipantInfo | undefined>(undefined);
  const router = useRouter()

  useEffect(() => {
    if(mainPresenterId === undefined) {
      const host = participants.find((info) => info.participant.userId.includes("host-"))
      if(!equalsWebiSalesProParticipant(host, mainParticiant)){
        setMainParticipant(host)
        strategy?.setMainPresenter(host)
        stageRef.current?.refreshStrategy()
      }
    } else {
      const presenter = participants.find((info) => info.participant.userId === mainPresenterId)
      if(!equalsWebiSalesProParticipant(presenter, mainParticiant)) {
        setMainParticipant(presenter)
        strategy?.setMainPresenter(presenter)
        stageRef.current?.refreshStrategy()
      }
    }
  },[mainPresenterId, participants, mainParticiant, stageRef, strategy])

  const join = useCallback(
    async (token: string) => {
      if(!isViewer) {
        await createLocalMedia()
      }

      await joinStage(
        true,
        token,
        setIsConnected,
        setParticipants,
        stageRef,
        localParticipantRef,
        strategy,
        onStreamEvent
      );
      if(getRequestHeaders) {
        await sessionController("start", seriesId, sessionId, {}, getRequestHeaders)
      }
    },
    [strategy, stageRef, createLocalMedia, seriesId, sessionId, getRequestHeaders]
  );

  const leave = useCallback(async () => {

    // Clear refs
    localParticipantRef.current = undefined;

    // Leave the IVS stage
    leaveStage(setIsConnected, stageRef.current ?? undefined);

    // UI cleanup
    setMainParticipant(undefined);
    setParticipants([]);
    if(getRequestHeaders) {
        await sessionController("stop", seriesId, sessionId, {}, getRequestHeaders)
        router.replace("/webinars")
      }
  }, [stageRef, getRequestHeaders]);

  return (
    <StageContext.Provider
      value={{
        isConnected,
        mainParticiant,
        participants,
        join,
        leave,
        stageRef,
        localParticipantRef,
      }}
    >
      {children}
    </StageContext.Provider>
  );
};