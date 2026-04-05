'use client';

import { createContext } from "react";

export type PlaybackUserContextType = {
  attendanceId: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

export const PlaybackUserContext = createContext<PlaybackUserContextType>({
  attendanceId: "",
  email: undefined,
  first_name: undefined,
  last_name: undefined,
});
