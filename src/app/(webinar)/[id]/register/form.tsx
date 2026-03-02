"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

import { type Webinar } from "@/webinar/service";
import { WebinarSessionStatus } from "@/webinar/service/enum";
import { getSessionAction, registerForWebinarAction } from "@/webinar/service/action";

interface DefaultRegistrationFormProps {
  webinar: Webinar;
}

const attendeeSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  session_id: z.string().uuid({ message: "Please select a session" }),
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

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AttendeeFormData>({
    resolver: zodResolver(attendeeSchema),
    defaultValues: {
      session_id: sessions.length > 0 ? sessions[0].id : undefined,
    },
  });

  const { execute, isPending } = useAction(registerForWebinarAction, {
    onSuccess: async ({data, input}) => {
      setIsNavigating(true);
      const registeredSessionId =  input.session_id

      // get latest session once registration is completed
      try {
        const session = await getSessionAction({id: registeredSessionId, token: data.access_token})
        if (session.data?.status === WebinarSessionStatus.IN_PROGRESS && data.access_token) {
          router.push(`/${session.data.id}/live?token=${data.access_token}`);
          return
        }
      } catch {
        toast.error("Registration succeeded, but we couldn't fetch the latest session status.");
      }

        router.push(`/${webinar.id}/register/success?session_id=${registeredSessionId}`);
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
                    <p className="mt-1 text-sm text-gray-500">{error.serverError}</p>
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
      session_id: data.session_id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
    });
  };

  const isBusy = isPending || isNavigating;

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className='flex flex-col gap-2'>
            <Label>Select a Session</Label>
            <Controller
              name="session_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
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

        {/* First name */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            {...register("first_name")}
            disabled={isBusy}
            autoComplete="given-name"
          />
          {errors.first_name && (
            <p className="text-red-500 text-sm">{errors.first_name.message}</p>
          )}
        </div>

        {/* Last name */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            {...register("last_name")}
            disabled={isBusy}
            autoComplete="family-name"
          />
          {errors.last_name && (
            <p className="text-red-500 text-sm">{errors.last_name.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            disabled={isBusy}
            autoComplete="email"
          />
          {errors.email && (
            <p className="text-red-500 text-sm">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input
            id="phone"
            {...register("phone")}
            disabled={isBusy}
            autoComplete="tel"
          />
        </div>

        <Button
          type="submit"
          className="bg-emerald-600"
          disabled={isBusy || sessions.length === 0}
          aria-busy={isBusy}
        >
          {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />}
          {isPending ? "Registering..." : isNavigating ? "Redirecting..." : "Register"}
        </Button>
      </form>
    </div>
  );
};
