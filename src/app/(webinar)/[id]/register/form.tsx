"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAction } from "next-safe-action/hooks";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { Webinar } from "@/webinar/service";
import { registerForWebinarAction } from "@/webinar/service/action";

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

  const sessions = useMemo(
    () => webinar.series?.flatMap((series) => series.sessions) ?? [],
    [webinar.series]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AttendeeFormData>({
    resolver: zodResolver(attendeeSchema),
  });

  const { execute, isPending } = useAction(registerForWebinarAction, {
    onSuccess: ({input}) => {
      // navigate to success page with selected session
      router.push(`/${webinar.id}/register/success?session_id=${input.session_id}`);
    },
    onError: ({error, input}) => {
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
    execute({
      webinar_id: webinar.id,
      session_id: data.session_id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
    });
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className='flex flex-col gap-1'>
            <Label htmlFor="session_id">Select a Session</Label>
            <select
                id="session_id"
                {...register("session_id")}
                className="border rounded px-3 py-2 text-sm"
            >
                {sessions?.map((session) => (
                <option key={session.id} value={session.id}>
                    {DateTime.fromISO(session.scheduled_start, { zone: session.timezone || 'utc' }).toFormat("cccc, LLLL d 'at' t ZZZZ")}
                </option>
                ))}
            </select>
            {errors.session_id && <p className="text-red-500 text-sm">{errors.session_id.message}</p>}
        </div>

        {/* First name */}
        <div className="flex flex-col gap-1">
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            {...register("first_name")}
            disabled={isPending}
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
            disabled={isPending}
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
            disabled={isPending}
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
            disabled={isPending}
            autoComplete="tel"
          />
        </div>

        <Button
          type="submit"
          className="bg-emerald-600"
          disabled={isPending || sessions.length === 0}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />}
          {isPending ? "Registering..." : "Register"}
        </Button>
      </form>
    </div>
  );
};
