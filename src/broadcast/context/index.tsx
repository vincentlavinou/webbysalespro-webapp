'use client'

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  ReactNode,
} from "react";

import {
  joinStage,
  leaveStage,
  LocalParticipantInfo,
} from "@broadcast/service/utils";

// ✅ Use type-only imports to avoid SSR errors
type Stage = import("amazon-ivs-web-broadcast").Stage;
type StageStrategy = import("amazon-ivs-web-broadcast").StageStrategy;
type StageParticipantInfo = import("amazon-ivs-web-broadcast").StageParticipantInfo;
type StageStream = import("amazon-ivs-web-broadcast").StageStream;

type LocalParticipant = {
  participant: StageParticipantInfo;
  streams: StageStream[];
};

type StageContextType = {
  isConnected: boolean;
  localParticipant: LocalParticipant | null;
  participants: LocalParticipant[];
  join: (token: string, micId: string | null, camId: string | null) => void;
  leave: () => void;
  stageRef?: React.RefObject<Stage | null>;
  localParticipantRef?: React.RefObject<LocalParticipantInfo | null>;
};

const StageContext = createContext<StageContextType | null>(null);

export const StageProvider = ({ children }: { children: ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);
  const [participants, setParticipants] = useState<LocalParticipant[]>([]);

  const stageRef = useRef<Stage | null>(null);
  const strategyRef = useRef<StageStrategy | null>(null);
  const localParticipantRef = useRef<LocalParticipantInfo | null>(null);

  const join = useCallback(
    async (token: string, micId: string | null, camId: string | null) => {
      await joinStage(
        true,
        token,
        micId,
        camId,
        setIsConnected,
        () => {},
        setLocalParticipant,
        setParticipants,
        strategyRef,
        stageRef,
        localParticipantRef
      );
    },
    []
  );

  const leave = useCallback(() => {
    leaveStage(setIsConnected, stageRef.current ?? undefined);
    setLocalParticipant(null);
    setParticipants([]);
  }, []);

  return (
    <StageContext.Provider
      value={{
        isConnected,
        localParticipant,
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
