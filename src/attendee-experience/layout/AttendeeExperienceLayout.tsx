"use client";

import { useEffect } from "react";
import { AttendeeBroadcastServiceToken } from "@/broadcast/service/type";
import { WebinarLoadingView } from "@/broadcast/components/views/WebinarLoadingView";
import { AttendeeCountProvider } from "@/broadcast/attendee-count/provider/AttendeeCountProvider";
import { useAttendeeLayoutMode } from "@/broadcast/hooks/use-attendee-layout-mode";
import { AttendeeDesktopExperience } from "./AttendeeDesktopExperience";
import { AttendeeMobileExperience } from "./AttendeeMobileExperience";

type AttendeeExperienceLayoutProps = {
  playbackToken: AttendeeBroadcastServiceToken;
  title?: string;
};

export function AttendeeExperienceLayout({
  playbackToken,
  title,
}: AttendeeExperienceLayoutProps) {
  const layoutMode = useAttendeeLayoutMode();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousHtmlOverscrollBehavior = html.style.overscrollBehavior;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousBodyHeight = body.style.height;

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.height = "100dvh";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      html.style.overscrollBehavior = previousHtmlOverscrollBehavior;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      body.style.height = previousBodyHeight;
    };
  }, []);

  if (!playbackToken.stream) {
    return <WebinarLoadingView />;
  }

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full overflow-hidden overscroll-none">
      <AttendeeCountProvider
        sessionId={playbackToken.session.id}
        initialCount={playbackToken.session.attendee_count}
        initialVisible={playbackToken.session.is_attendee_count_visible}
      >
        {layoutMode === "mobile" ? (
          <AttendeeMobileExperience playbackToken={playbackToken} title={title} />
        ) : (
          <AttendeeDesktopExperience
            playbackToken={playbackToken}
            title={title}
            compact={layoutMode === "desktop-compact"}
          />
        )}
      </AttendeeCountProvider>
    </div>
  );
}
