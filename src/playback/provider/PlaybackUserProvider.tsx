'use client';

import { PlaybackUserContext } from "../context/PlaybackUserContext";
import { PlaybackUser } from "../service/type";

export type PlaybackUserProviderProps = {
  user: PlaybackUser;
  children: React.ReactNode;
};

export function PlaybackUserProvider({
  children,
  user,
}: PlaybackUserProviderProps) {
  return (
    <PlaybackUserContext.Provider
      value={{
        userId: user.user_id,
        registrantId: user.registrant_id,
        attendanceId: user.attendance_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      }}
    >
      {children}
    </PlaybackUserContext.Provider>
  );
}
