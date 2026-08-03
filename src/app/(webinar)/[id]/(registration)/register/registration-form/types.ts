import type { Webinar, WebinarPauseInfo } from "@/webinar/service";

export interface RegistrationFormProps {
  webinarPromise: Promise<Webinar>;
  webinarId: string;
  primaryColor?: string;
  secondaryColor?: string;
  secondaryBackgroundColor?: string;
  buttonTextColor?: string;
  ctaLabel?: string;
  embedSource?: string;
  embedSuccessUrl?: string;
  landingPageSource?: string;
  landingSuccessUrl?: string | null;
}

export type RegistrationSuccessState = {
  scheduledStart: string;
  timezone: string;
};

export type RegistrationFormState = {
  pauseInfo: WebinarPauseInfo | null;
  successState: RegistrationSuccessState | null;
};
