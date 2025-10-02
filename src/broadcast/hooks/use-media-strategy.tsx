import { useContext } from "react";
import { MediaStrategyContext } from "../context/MediaStrategyContext";


export const useMediaStrategy = () => {
  const ctx = useContext(MediaStrategyContext);
  if (!ctx) throw new Error("useMediaStrategy must be used inside MediaStrategyProvider");
  return ctx;
};