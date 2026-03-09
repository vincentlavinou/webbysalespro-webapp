"use client";

import { createContext } from "react";

export type AttendeeCountContextType = {
  count: number;
  visible: boolean;
};

export const AttendeeCountContext = createContext<AttendeeCountContextType | null>(null);
