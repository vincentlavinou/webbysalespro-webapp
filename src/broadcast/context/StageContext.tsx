'use client'

import {
  createContext,
} from "react";


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

export const StageContext = createContext<StageContextType | null>(null);
