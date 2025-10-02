import { useContext } from "react";
import { StageContext } from "../context/StageContext";


export const useStageContext = () => {
  const ctx = useContext(StageContext);
  if (!ctx) throw new Error("useStageContext must be used inside StageProvider");
  return ctx;
};