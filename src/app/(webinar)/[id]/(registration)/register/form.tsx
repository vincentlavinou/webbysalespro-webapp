"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useAnimation } from "framer-motion";
import { DateTime } from "luxon";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAction } from "next-safe-action/hooks";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { webinarAppUrl, type Webinar } from "@/webinar/service";
import { registerForWebinarAction } from "@/webinar/service/action";
import { WebinarSessionStatus } from "@/webinar/service/enum";
import { allowsManualSessionSelection } from "@/webinar/service/guards";
import { extractJoinToken, extractJoinUrl } from "@/webinar/service/join";

interface DefaultRegistrationFormProps {
  webinar: Webinar;
}

const PHONE_ALLOWED_CHARACTERS = /^[+\d\s().-]+$/;
const PHONE_EXTENSION_PATTERN = /\s*(?:ext\.?|x)\s*\d+$/i;

const isValidPhoneNumber = (value: string) => {
  const normalizedValue = value.replace(PHONE_EXTENSION_PATTERN, "");
  const plusCount = (normalizedValue.match(/\+/g) || []).length;

  if (plusCount > 1 || (plusCount === 1 && !normalizedValue.startsWith("+"))) {
    return false;
  }

  if (!PHONE_ALLOWED_CHARACTERS.test(normalizedValue)) {
    return false;
  }

  const digits = normalizedValue.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
};

const attendeeSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .refine(isValidPhoneNumber, "Enter a valid phone number"),
  session_id: z.string().uuid({ message: "Please select a session" }).optional(),
});

type AttendeeFormData = z.infer<typeof attendeeSchema>;


export const DefaultRegistrationForm = ({ webinar }: DefaultRegistrationFormProps) => {
  const router = useRouter();
  const submitLockRef = useRef(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const sessions = useMemo(
    () => webinar.series?.sessions || [],
    [webinar.series]
  );
  const allowsSessionSelection = allowsManualSessionSelection(webinar);
  const autoAssignedSession = useMemo(
    () =>
      sessions.find((session) => session.status === WebinarSessionStatus.IN_PROGRESS)
      ?? sessions[0],
    [sessions]
  );
  const formSchema = useMemo(
    () =>
      attendeeSchema.superRefine((data, ctx) => {
        if (allowsSessionSelection && !data.session_id) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["session_id"],
            message: "Please select a session",
          });
        }
      }),
    [allowsSessionSelection]
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AttendeeFormData>({
    resolver: zodResolver(formSchema),
  });

  const { execute, isPending } = useAction(registerForWebinarAction, {
    onSuccess: async ({data, input}) => {
      setIsNavigating(true);
      const registeredSessionId = input.session_id ?? autoAssignedSession?.id;
      const registeredSession = webinar.series?.sessions.find((session) => session.id === registeredSessionId)
        ?? autoAssignedSession;
      const hasLiveSession = webinar.series?.sessions.some(
        (session) => session.status === WebinarSessionStatus.IN_PROGRESS
      ) ?? false;
      const shouldJoinLive = registeredSession
        ? registeredSession.status === WebinarSessionStatus.IN_PROGRESS
        : hasLiveSession;

      const joinUrl = extractJoinUrl(data)
      if (!joinUrl) {
        toast.error("Registration succeeded but no join link was returned. Please check your email.");
        setIsNavigating(false);
        return;
      }

      const rawJoinToken = extractJoinToken(data);

      if (!rawJoinToken) {
        toast.error("Registration succeeded but the join link was invalid. Please check your email.");
        setIsNavigating(false);
        return;
      }

      if (shouldJoinLive) {
        router.push(joinUrl);
        return;
      }

      const successUrl = webinar.registration_settings?.registration_success_url;
      if (successUrl) {
        const params = new URLSearchParams();
        params.set('wsp_lead_first_name', input.first_name);
        params.set('wsp_lead_last_name', input.last_name);
        if (input.phone) params.set('wsp_lead_phone', input.phone);
        if (registeredSession) {
          const dt = DateTime.fromISO(registeredSession.scheduled_start, { zone: registeredSession.timezone || 'utc' });
          params.set('wsp_event_ts', String(Math.floor(dt.toMillis() / 1000)));
          params.set('wsp_event_tz', registeredSession.timezone || 'utc');
          params.set('wsp_next_event_date', dt.toFormat("cccc, d LLLL yyyy"));
          params.set('wsp_next_event_time', dt.toFormat("h:mm a"));
          params.set('wsp_next_event_timezone', `(GMT${dt.toFormat("ZZ")}) ${dt.toFormat("ZZZZZ")}`);
        }
        const separator = successUrl.includes('?') ? '&' : '?';
        router.push(`${successUrl}${separator}email=${input.email}&${params.toString()}`);
        return;
      }

      const successParams = new URLSearchParams({
        t: rawJoinToken,
        webinar_id: webinar.id,
      });
      if (registeredSessionId) {
        successParams.set("session_id", registeredSessionId);
      }

      router.push(`${webinarAppUrl}/${webinar.id}/register/success?${successParams.toString()}`);
    },
    onError: ({error, input}) => {
      submitLockRef.current = false;
      setIsNavigating(false);
      // `error` here is whatever your action throws / returns as serverError
      if (!error) {
        toast.error("Something went wrong. Please try again.");
        return;
      }

      toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "animate-enter" : "animate-leave"
              } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
            >
              <div className="flex-1 w-0 p-4">
                <div className="flex items-start">
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {input.first_name} {input.last_name}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">{error.serverError?.detail}</p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-200">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-emerald-600 hover:text-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  close
                </button>
              </div>
            </div>
          ),
          {
            duration: Infinity,
            position: "top-right"
          }

        );
    },
  });

  const onSubmit = (data: AttendeeFormData) => {
    if (submitLockRef.current || isPending || isNavigating) {
      return;
    }

    submitLockRef.current = true;

    execute({
      webinar_id: webinar.id,
      ...(data.session_id ? { session_id: data.session_id } : {}),
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
    });
  };

  const isBusy = isPending || isNavigating;

  const pulseControls = useAnimation();
  const isFieldFocusedRef = useRef(false);

  useEffect(() => {
    const pulse = () => {
      if (isFieldFocusedRef.current) return;
      pulseControls.start({
        opacity: [1, 0.25, 1, 0.25, 1],
        scale: [1, 1.03, 1, 1.03, 1],
        transition: { duration: 0.75, ease: "easeInOut" },
      });
    };

    const timers = [
      setTimeout(pulse, 7000),
      setTimeout(pulse, 32000),
      setTimeout(pulse, 57000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [pulseControls]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onFocus={() => { isFieldFocusedRef.current = true }}
      onBlur={() => { isFieldFocusedRef.current = false }}
      className="space-y-4"
    >
      {allowsSessionSelection ? (
        <div className="flex flex-col gap-2">
          <Label className="text-gray-700">Select a Session</Label>
          <Controller
            name="session_id"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full bg-white border-gray-200">
                  <SelectValue placeholder="Select a session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions?.map((session) => {
                    const isLive = session.status === WebinarSessionStatus.IN_PROGRESS;
                    return (
                      <SelectItem key={session.id} value={session.id}>
                        <span className="flex items-center gap-2">
                          {DateTime.fromISO(session.scheduled_start, { zone: session.timezone || 'utc' }).toFormat("cccc, LLLL d 'at' t ZZZZ")}
                          {isLive && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
                              </span>
                              LIVE
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          />
          {errors.session_id && <p className="text-red-500 text-sm">{errors.session_id.message}</p>}
        </div>
      ) : autoAssignedSession ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-semibold text-emerald-900">You&apos;ll be registered for the next available session.</p>
          <p className="mt-1 text-sm text-emerald-800">
            {DateTime.fromISO(autoAssignedSession.scheduled_start, { zone: autoAssignedSession.timezone || "utc" }).toFormat("cccc, LLLL d 'at' t ZZZZ")}
          </p>
        </div>
      ) : null}

      {/* First & Last name side-by-side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="first_name" className="text-gray-700">First Name</Label>
          <Input
            id="first_name"
            placeholder="Jane"
            {...register("first_name")}
            disabled={isBusy}
            autoComplete="given-name"
            className="bg-white border-gray-200"
          />
          {errors.first_name && (
            <p className="text-red-500 text-xs">{errors.first_name.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="last_name" className="text-gray-700">Last Name</Label>
          <Input
            id="last_name"
            placeholder="Doe"
            {...register("last_name")}
            disabled={isBusy}
            autoComplete="family-name"
            className="bg-white border-gray-200"
          />
          {errors.last_name && (
            <p className="text-red-500 text-xs">{errors.last_name.message}</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1">
        <Label htmlFor="email" className="text-gray-700">Email Address</Label>
        <Input
          id="email"
          type="email"
          placeholder="jane@example.com"
          {...register("email")}
          disabled={isBusy}
          autoComplete="email"
          className="bg-white border-gray-200"
        />
        {errors.email && (
          <p className="text-red-500 text-xs">{errors.email.message}</p>
        )}
      </div>

      {/* Phone */}
      <div className="flex flex-col gap-1">
        <Label htmlFor="phone" className="text-gray-700">Phone</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          placeholder="+1 (555) 000-0000"
          {...register("phone")}
          disabled={isBusy}
          autoComplete="tel"
          className="bg-white border-gray-200"
        />
        {errors.phone && (
          <p className="text-red-500 text-xs">{errors.phone.message}</p>
        )}
      </div>

      {/* Submit */}
      <motion.div animate={pulseControls}>
        <Button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 text-base rounded-xl transition-colors mt-2"
          disabled={isBusy || sessions.length === 0}
          aria-busy={isBusy}
        >
          {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? "Registering..." : isNavigating ? "Redirecting..." : "Reserve My Spot →"}
        </Button>
      </motion.div>

    </form>
  );
};
