"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { PausedWebinarNotice } from "@/webinar/components";
import { attendeeSchema, type AttendeeFormData } from "./registration-form/schema";
import { AttendeeFields } from "./registration-form/AttendeeFields";
import { SessionField, SessionFieldLoading } from "./registration-form/SessionField";
import { SubmitButton, SubmitButtonLoading } from "./registration-form/SubmitButton";
import { SuccessState } from "./registration-form/SuccessState";
import { useRegistrationSubmission } from "./registration-form/useRegistrationSubmission";
import type { RegistrationFormProps, RegistrationSuccessState } from "./registration-form/types";

export type { RegistrationFormProps } from "./registration-form/types";

export const DefaultRegistrationForm = (props: RegistrationFormProps) => {
  const { webinarPromise, webinarId, primaryColor, secondaryColor, secondaryBackgroundColor, buttonTextColor, ctaLabel, embedSource, embedSuccessUrl, landingPageSource, landingSuccessUrl } = props;
  const searchParams = useSearchParams();
  const [refSource, setRefSource] = useState(() => searchParams.get("ref") ?? "");
  const [isHydrated, setIsHydrated] = useState(false);
  const [successState, setSuccessState] = useState<RegistrationSuccessState | null>(null);
  const submitButtonRef = useRef<HTMLDivElement>(null);
  const isFieldFocusedRef = useRef(false);
  const form = useForm<AttendeeFormData>({ resolver: zodResolver(attendeeSchema) });
  const { control, setError, handleSubmit } = form;
  const { submit, isPending, isNavigating, pauseInfo } = useRegistrationSubmission({ webinarPromise, webinarId, embedSource, embedSuccessUrl, landingPageSource, landingSuccessUrl, onSuccess: setSuccessState });
  const busy = isPending || isNavigating;

  useEffect(() => setIsHydrated(true), []);
  useEffect(() => {
    const handleRefMessage = (event: MessageEvent) => {
      const message = event.data;
      if (!message || typeof message !== "object" || message.type !== "wsp-webinar-embed" || typeof message.ref !== "string") return;

      const nextRef = message.ref.trim();
      if (nextRef) setRefSource(nextRef);
    };

    window.addEventListener("message", handleRefMessage);
    return () => window.removeEventListener("message", handleRefMessage);
  }, []);
  useEffect(() => {
    const pulse = () => {
      if (isFieldFocusedRef.current) return;
      submitButtonRef.current?.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0.25, transform: "scale(1.03)" }, { opacity: 1, transform: "scale(1)" }, { opacity: 0.25, transform: "scale(1.03)" }, { opacity: 1, transform: "scale(1)" }], { duration: 750, easing: "ease-in-out" });
    };
    const timers = [7000, 32000, 57000].map((delay) => setTimeout(pulse, delay));
    return () => timers.forEach(clearTimeout);
  }, []);

  if (pauseInfo) return <PausedWebinarNotice pauseInfo={pauseInfo} />;
  if (successState) return <SuccessState state={successState} primaryColor={primaryColor} secondaryColor={secondaryColor} secondaryBackgroundColor={secondaryBackgroundColor} />;

  return <Form {...form}><form onSubmit={handleSubmit((data) => submit(data, refSource, setError))} onFocus={() => { isFieldFocusedRef.current = true; }} onBlur={() => { isFieldFocusedRef.current = false; }} className="space-y-4">
    <Suspense fallback={<SessionFieldLoading />}><SessionField webinarPromise={webinarPromise} control={control} primaryColor={primaryColor} secondaryColor={secondaryColor} secondaryBackgroundColor={secondaryBackgroundColor} /></Suspense>
    <AttendeeFields control={control} disabled={busy} />
    <Suspense fallback={<SubmitButtonLoading primaryColor={primaryColor} buttonTextColor={buttonTextColor} />}><SubmitButton webinarPromise={webinarPromise} submitButtonRef={submitButtonRef} primaryColor={primaryColor} buttonTextColor={buttonTextColor} ctaLabel={ctaLabel} isHydrated={isHydrated} isPending={isPending} isNavigating={isNavigating} /></Suspense>
  </form></Form>;
};
