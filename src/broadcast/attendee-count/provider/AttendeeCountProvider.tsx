"use client";

import { useCallback, useState } from "react";
import { AttendeeCountContext } from "../context/AttendeeCountContext";
import { attendeeCountMetadataSchema, type AttendeeCountMetadataEvent } from "../service/schema";
import { useAudienceEvent } from "@/audience-events/hooks/use-audience-event";

type Props = {
  children: React.ReactNode;
  initialCount: number;
  initialVisible: boolean;
  sessionId: string;
};

export function AttendeeCountProvider({ children, initialCount, initialVisible, sessionId }: Props) {
  const [count, setCount] = useState(initialCount);
  const [visible, setVisible] = useState(initialVisible);

  const handleEvent = useCallback((evt: AttendeeCountMetadataEvent) => {
    setVisible(evt.payload.is_attendee_count_visible);
    if (evt.payload.is_attendee_count_visible) {
      setCount(evt.payload.count);
    }
  }, []);

  useAudienceEvent({
    eventType: "webinar:attendee_count:update",
    schema: attendeeCountMetadataSchema,
    sessionId,
    getStateScope: (evt) => evt.session_id,
    compareEventKeys: (incoming, latestApplied) => incoming.localeCompare(latestApplied),
    onEvent: handleEvent,
  });

  return (
    <AttendeeCountContext.Provider value={{ count, visible }}>
      {children}
    </AttendeeCountContext.Provider>
  );
}
