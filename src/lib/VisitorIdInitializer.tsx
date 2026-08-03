"use client";

import { useEffect } from "react";
import { getOrCreateVisitorId } from "./visitor-id";

export function VisitorIdInitializer() {
  useEffect(() => {
    getOrCreateVisitorId();
  }, []);

  return null;
}
