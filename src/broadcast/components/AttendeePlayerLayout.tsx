"use client";

import { useEffect } from "react";
import { AttendeeBroadcastServiceToken } from "../service/type";
import { WebinarLoadingView } from "./views/WebinarLoadingView";
import AttendeeMobileLayout from "./AttendeeMobileLayout";
import { AttendeeDesktopLayout } from "./AttendeeDesktopLayout";
import { AttendeeCountProvider } from "../attendee-count/provider/AttendeeCountProvider";
import { useAttendeeLayoutMode } from "../hooks/use-attendee-layout-mode";

interface BroadcastUIProps {
  broadcast: AttendeeBroadcastServiceToken;
  title?: string;
}

export const AttendeePlayerLayout = ({
  broadcast,
  title,
}: BroadcastUIProps) => {
  const layoutMode = useAttendeeLayoutMode();
  const isMobileLayout = layoutMode === "mobile";

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousHtmlOverscrollBehavior = html.style.overscrollBehavior;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousBodyHeight = body.style.height;

    if (isMobileLayout) {
      html.style.overflow = previousHtmlOverflow;
      html.style.overscrollBehavior = previousHtmlOverscrollBehavior;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      body.style.height = previousBodyHeight;
    } else {
      html.style.overflow = "hidden";
      html.style.overscrollBehavior = "none";
      body.style.overflow = "hidden";
      body.style.overscrollBehavior = "none";
      body.style.height = "100dvh";
    }

    return () => {
      html.style.overflow = previousHtmlOverflow;
      html.style.overscrollBehavior = previousHtmlOverscrollBehavior;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      body.style.height = previousBodyHeight;
    };
  }, [isMobileLayout]);

  const hasStream = !!broadcast.stream;
  if (!hasStream) return <WebinarLoadingView />;

  return (
    <div className={`h-[100dvh] max-h-[100dvh] w-full ${isMobileLayout ? "overflow-visible overscroll-y-auto" : "overflow-hidden overscroll-none"}`}>
      <AttendeeCountProvider
        sessionId={broadcast.session.id}
        initialCount={broadcast.session.attendee_count}
        initialVisible={broadcast.session.is_attendee_count_visible}
      >
        {layoutMode === "mobile" ? (
          <AttendeeMobileLayout
            broadcast={broadcast}
            title={title}
          />
        ) : (
          <AttendeeDesktopLayout
            broadcast={broadcast}
            title={title}
            compact={layoutMode === "desktop-compact"}
          />
        )}
      </AttendeeCountProvider>
    </div>
  );
};
