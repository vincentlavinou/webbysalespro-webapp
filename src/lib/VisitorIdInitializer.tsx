"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateVisitorId } from "./visitor-id";

export function VisitorIdInitializer() {
  const router = useRouter();

  useEffect(() => {
    const hadVisitorId = document.cookie.includes("visitor_id=");
    getOrCreateVisitorId();
    if (!hadVisitorId) router.refresh();
  }, [router]);

  return null;
}
