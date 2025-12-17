"use client";

import { useEffect, useState } from "react";
import { AttendeeBroadcastServiceToken } from "../service/type";
import { WebinarLoadingView } from "./views/WebinarLoadingView";
import AttendeeMobileLayout from "./AttendeeMobileLayout";
import { AttendeeDesktopLayout } from "./AttendeeDesktopLayout";

interface BroadcastUIProps {
  broadcast: AttendeeBroadcastServiceToken;
  accessToken?: string;
  title?: string;
}

export const AttendeePlayerLayout = ({ accessToken, broadcast, title }: BroadcastUIProps) => {

  const [isMobile, setIsMobile] = useState(false);

  // --- Detect mobile vs desktop (lg breakpoint-ish) ---
  useEffect(() => {
    const updateIsMobile = () => {
      if (typeof window === "undefined") return;
      setIsMobile(window.innerWidth < 1024); // Tailwind lg = 1024px
    };
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  const hasStream = !!broadcast.stream;
  if (!hasStream) return <WebinarLoadingView />;

  return (
    <>
      {isMobile ? <AttendeeMobileLayout 
        broadcast={broadcast} 
        accessToken={accessToken}
        title={title} 
      /> : <AttendeeDesktopLayout 
        broadcast={broadcast} 
        accessToken={accessToken}
        title={title} 
        />}
    </>
  );
};
