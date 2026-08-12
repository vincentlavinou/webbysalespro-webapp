"use client";

import { createContext, useContext } from "react";
import type { StageStateDefinition } from "@/broadcast/service/type";
import type { ResolvedStageArrangement } from "./stage-state";

/**
 * How the stage is drawn.
 *
 * Null on a session without layout setup, and nothing on the solo path may read
 * it: there is one publisher there and no arrangement to describe. Only
 * AttendeeStageViewer consumes this, and it renders only while the capability
 * says layout applies.
 */
export type StageArrangementState = {
  layout: ResolvedStageArrangement;
  stageDefinition?: StageStateDefinition;
};

export const StageArrangementContext = createContext<StageArrangementState | null>(null);

export function useStageArrangement() {
  const ctx = useContext(StageArrangementContext);
  if (!ctx) {
    throw new Error(
      "useStageArrangement must be called within PersistentStagePlaybackProvider",
    );
  }
  return ctx;
}
