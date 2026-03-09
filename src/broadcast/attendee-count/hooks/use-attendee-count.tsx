"use client";

import { useContext } from "react";
import { AttendeeCountContext } from "../context/AttendeeCountContext";

export function useAttendeeCount() {
  const ctx = useContext(AttendeeCountContext);
  if (!ctx) throw new Error("useAttendeeCount must be used within AttendeeCountProvider");
  return ctx;
}
