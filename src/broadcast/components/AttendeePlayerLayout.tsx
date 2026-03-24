"use client";

import { AttendeeBroadcastServiceToken } from "../service/type";
import { WebinarLoadingView } from "./views/WebinarLoadingView";
import AttendeeMobileLayout from "./AttendeeMobileLayout";
import { AttendeeDesktopLayout } from "./AttendeeDesktopLayout";
import { AttendeeCountProvider } from "../attendee-count/provider/AttendeeCountProvider";
import { useAttendeeLayoutMode } from "../hooks/use-attendee-layout-mode";

interface BroadcastUIProps {
  broadcast: AttendeeBroadcastServiceToken;
  accessToken?: string;
  title?: string;
}

export const AttendeePlayerLayout = ({ accessToken, broadcast, title }: BroadcastUIProps) => {
  const layoutMode = useAttendeeLayoutMode();

  const hasStream = !!broadcast.stream;
  if (!hasStream) return <WebinarLoadingView />;

  return (
    <AttendeeCountProvider
      sessionId={broadcast.session.id}
      initialCount={broadcast.session.attendee_count}
      initialVisible={broadcast.session.is_attendee_count_visible}
    >
      {layoutMode === "mobile" ? (
        <AttendeeMobileLayout
          broadcast={broadcast}
          accessToken={accessToken}
          title={title}
        />
      ) : (
        <AttendeeDesktopLayout
          broadcast={broadcast}
          accessToken={accessToken}
          title={title}
          compact={layoutMode === "desktop-compact"}
        />
      )}
    </AttendeeCountProvider>
  );
};
