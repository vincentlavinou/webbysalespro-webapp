'use client'

import {
  createContext,
  useContext,
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
import { recordEvent, sessionController } from "../service";
import { useBroadcastConfiguration } from "../hooks";

// ✅ Use type-only imports to avoid SSR errors
type Stage = import("amazon-ivs-web-broadcast").Stage;
type StageParticipantInfo = import("amazon-ivs-web-broadcast").StageParticipantInfo;
type StageStream = import("amazon-ivs-web-broadcast").StageStream;

export type WebiSalesProParticipant = {
  participant: StageParticipantInfo;
  streams: StageStream[];
};

type StageContextType = {
  isConnected: boolean;
  mainParticiant: WebiSalesProParticipant | undefined;
  participants: WebiSalesProParticipant[];
  join: (token: string) => void;
  leave: () => void;
  stageRef?: React.RefObject<Stage | undefined>;
  localParticipantRef?: React.RefObject<StageParticipantInfo | undefined>;
};

const StageContext = createContext<StageContextType | null>(null);

export const StageProvider = ({ children, stageRef }: { children: ReactNode, stageRef: RefObject<Stage | undefined> }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [mainParticiant, setMainParticipant] = useState<WebiSalesProParticipant | undefined>(undefined);
  const [participants, setParticipants] = useState<WebiSalesProParticipant[]>([]);
  
  const { strategy, create: createLocalMedia } = useLocalMedia()
  const { mainPresenterId } = useBroadcastService()
  const {sessionId, seriesId, requestHeaders, accessToken} = useBroadcastConfiguration()

  const localParticipantRef = useRef<StageParticipantInfo | undefined>(undefined);

  useEffect(() => {
    if(mainPresenterId === undefined) {
      const host = participants.find((info) => info.participant.userId.includes("host-"))
      if(!equalsWebiSalesProParticipant(host, mainParticiant)){
        console.log("setting main partipant as host")
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
      await createLocalMedia()
      await joinStage(
        true,
        token,
        setIsConnected,
        setParticipants,
        stageRef,
        localParticipantRef,
        strategy,
      );
      if(requestHeaders) {
        await sessionController("start", seriesId, sessionId, requestHeaders)
      } else if(accessToken) {
        recordEvent("joined", sessionId, accessToken)
      }
    },
    [strategy, stageRef, createLocalMedia, seriesId, sessionId, requestHeaders, accessToken]
  );

  const leave = useCallback(async () => {

    // Clear refs
    localParticipantRef.current = undefined;

    // Leave the IVS stage
    leaveStage(setIsConnected, stageRef.current ?? undefined);

    // UI cleanup
    setMainParticipant(undefined);
    setParticipants([]);
    if(requestHeaders) {
        await sessionController("stop", seriesId, sessionId, requestHeaders)
      } else if(accessToken) {
        recordEvent("left", sessionId, accessToken)
      }
  }, [stageRef]);

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

export const useStageContext = () => {
  const ctx = useContext(StageContext);
  if (!ctx) throw new Error("useStageContext must be used inside StageProvider");
  return ctx;
};
