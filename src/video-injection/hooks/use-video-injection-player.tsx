"use client";

import { useContext } from "react";
import {
  VideoInjectionPlayerContext,
  VideoInjectionPlayerContextType,
} from "../context/VideoInjectionPlayerContext";

export function useVideoInjectionPlayer(): VideoInjectionPlayerContextType {
  return useContext(VideoInjectionPlayerContext);
}
