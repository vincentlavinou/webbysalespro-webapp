"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import toast from "react-hot-toast";
import { notifyErrorUiMessage } from "@/lib/notify";
import { registerForWebinarAction } from "@/webinar/service/action";
import { webinarAppUrl, type Webinar, type WebinarPauseInfo } from "@/webinar/service";
import { WebinarSessionStatus } from "@/webinar/service/enum";
import { didShortLinkResolutionFail, extractJoinToken, extractJoinUrl } from "@/webinar/service/join";
import { allowsManualSessionSelection } from "@/webinar/service/guards";
import type { AttendeeFormData } from "./schema";
import { appendRegistrationQuery, findRegisteredSession, getRegistrationSuccessUrl } from "./navigation";
import type { RegistrationSuccessState } from "./types";
import { getVisitorId } from "@/lib/visitor-id";

function isPauseInfo(value: unknown): value is WebinarPauseInfo {
  return Boolean(value && typeof value === "object" && typeof (value as Partial<WebinarPauseInfo>).support_email === "string");
}

export function useRegistrationSubmission({ webinarPromise, webinarId, embedSource, embedSuccessUrl, landingPageSource, landingSuccessUrl, onSuccess }: { webinarPromise: Promise<Webinar>; webinarId: string; embedSource?: string; embedSuccessUrl?: string; landingPageSource?: string; landingSuccessUrl?: string | null; onSuccess: (state: RegistrationSuccessState) => void }) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [pauseInfo, setPauseInfo] = useState<WebinarPauseInfo | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const successInline = Boolean(embedSource && !embedSuccessUrl);
  const navigate = (url: string) => {
    if (!embedSource) { router.push(url); return true; }
    try { window.top!.location.href = url; return true; } catch {
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (opened) { opened.opener = null; return true; }
      notifyErrorUiMessage("Please allow pop-ups to continue."); setIsLocked(false); setIsNavigating(false); return false;
    }
  };

  const { execute, isPending } = useAction(registerForWebinarAction, {
    onSuccess: async ({ data, input }) => {
      if (embedSource && window.parent !== window) window.parent.postMessage({ type: "wsp:registration:success", webinarId, source: embedSource, email: input.email, firstName: input.first_name, lastName: input.last_name, phone: input.phone ?? undefined }, "*");
      const webinar = await webinarPromise;
      const { session, sessionId } = findRegisteredSession(webinar, input);
      const successUrl = getRegistrationSuccessUrl(webinar, embedSource, embedSuccessUrl, landingPageSource, landingSuccessUrl);
      const joinUrl = extractJoinUrl(data);
      const live = session?.status === WebinarSessionStatus.IN_PROGRESS;
      setIsNavigating(true);
      if (!joinUrl) return handleMissingJoin({ successUrl, session, input, successInline });
      if (live && !(didShortLinkResolutionFail(data) && successUrl)) return navigate(joinUrl);
      if (successUrl) return navigate(appendRegistrationQuery(successUrl, input, session));
      if (successInline && session) return showInlineSuccess(session);
      const token = extractJoinToken(data);
      if (!token) { notifyErrorUiMessage("Registration succeeded but the join link was invalid. Please check your email."); setIsNavigating(false); return; }
      const path = landingPageSource ? `/${webinar.id}/register/${landingPageSource}/success` : `/${webinar.id}/register/success`;
      const params = new URLSearchParams({ t: token, webinar_id: webinar.id });
      if (sessionId) params.set("session_id", sessionId);
      navigate(`${webinarAppUrl}${path}?${params.toString()}`);
    },
    onError: ({ error, input }) => {
      setIsLocked(false); setIsNavigating(false);
      if (!error) return notifyErrorUiMessage("Something went wrong. Please try again.");
      if (error.serverError?.code === "WEB-PAUSED" && isPauseInfo(error.serverError.pauseInfo)) return setPauseInfo(error.serverError.pauseInfo);
      toast.error(`${input.first_name} ${input.last_name}: ${error.serverError?.detail ?? "Registration failed. Please try again."}`);
    },
  });

  function showInlineSuccess(session: NonNullable<ReturnType<typeof findRegisteredSession>["session"]>) { onSuccess({ scheduledStart: session.scheduled_start, timezone: session.timezone || "utc" }); setIsLocked(false); setIsNavigating(false); }
  function handleMissingJoin({ successUrl, session, input, successInline }: { successUrl?: string | null; session?: ReturnType<typeof findRegisteredSession>["session"]; input: Parameters<typeof appendRegistrationQuery>[1]; successInline: boolean }) {
    if (successUrl && session) return navigate(appendRegistrationQuery(successUrl, input, session));
    if (successInline && session) return showInlineSuccess(session);
    notifyErrorUiMessage("Registration succeeded but no join link was returned. Please check your email."); setIsNavigating(false);
  }

  async function submit(data: AttendeeFormData, refSource: string, setError: (name: "session_id", error: { message: string }) => void) {
    if (isLocked || isPending || isNavigating) return;
    const webinar = await webinarPromise;
    if (allowsManualSessionSelection(webinar) && !data.session_id) return setError("session_id", { message: "Please select a session" });
    setIsLocked(true);
    const visitorId = getVisitorId();
    execute({ webinar_id: webinarId, ...(data.session_id ? { session_id: data.session_id } : {}), first_name: data.first_name, last_name: data.last_name, email: data.email, phone: data.phone, ...(embedSource ? { embed_source: embedSource } : {}), ...(landingPageSource ? { landing_page_source: landingPageSource } : {}), ...(refSource ? { ref_source: refSource } : {}), ...(visitorId ? { visitor_id: visitorId } : {}) });
  }

  return { submit, isPending, isNavigating, pauseInfo };
}
