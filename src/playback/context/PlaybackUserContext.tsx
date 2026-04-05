'use client';

import { createContext } from "react";

export type PlaybackUserContextType = {
  userId: string;
  registrantId: string;
  attendanceId: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

export const PlaybackUserContext = createContext<PlaybackUserContextType>({
  userId: "",
  registrantId: "",
  attendanceId: "",
  email: undefined,
  first_name: undefined,
  last_name: undefined,
});
