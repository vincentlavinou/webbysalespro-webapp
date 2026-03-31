"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { anonymousRegisterForWebinarAction } from "@/webinar/service/action";
import { extractJoinUrl } from "@/webinar/service/join";

interface AnonymousJoinClientProps {
  webinarId: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getAnonymousRegistrantStorageKey(webinarId: string) {
  return `webisalespro.webinar.${webinarId}.anonymous-registrant-id`;
}

export function AnonymousJoinClient({ webinarId }: AnonymousJoinClientProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasStartedRef = useRef(false);
  const hasRetriedWithoutStoredIdRef = useRef(false);

  const { execute, isPending } = useAction(anonymousRegisterForWebinarAction, {
    onSuccess: ({ data }) => {
      const storageKey = getAnonymousRegistrantStorageKey(webinarId);

      try {
        localStorage.setItem(storageKey, data.id);
      } catch {
        // Ignore localStorage write failures and continue the join flow.
      }

      const joinUrl = extractJoinUrl(data);
      if (!joinUrl) {
        setErrorMessage("We could not create a valid join link for this webinar.");
        return;
      }

      router.replace(joinUrl);
    },
    onError: ({ error, input }) => {
      const storageKey = getAnonymousRegistrantStorageKey(webinarId);

      if (input.anonymous_registrant_id && !hasRetriedWithoutStoredIdRef.current) {
        hasRetriedWithoutStoredIdRef.current = true;

        try {
          localStorage.removeItem(storageKey);
        } catch {
          // Ignore localStorage write failures and continue with a clean retry.
        }

        execute({ webinar_id: webinarId });
        return;
      }

      setErrorMessage(error.serverError?.detail ?? "We could not start the webinar right now.");
    },
  });

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    const storageKey = getAnonymousRegistrantStorageKey(webinarId);
    let anonymousRegistrantId: string | undefined;

    try {
      const storedRegistrantId = localStorage.getItem(storageKey);
      if (storedRegistrantId && UUID_PATTERN.test(storedRegistrantId)) {
        anonymousRegistrantId = storedRegistrantId;
      } else if (storedRegistrantId) {
        localStorage.removeItem(storageKey);
      }
    } catch {
      anonymousRegistrantId = undefined;
    }

    execute({
      webinar_id: webinarId,
      ...(anonymousRegistrantId ? { anonymous_registrant_id: anonymousRegistrantId } : {}),
    });
  }, [execute, webinarId]);

  if (errorMessage) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => window.location.reload()} className="bg-emerald-600 hover:bg-emerald-700">
            Try Again
          </Button>
          <Button asChild variant="outline">
            <Link href={`/${webinarId}/register`}>Open Registration Page</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Preparing your access
      </div>
      <div className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
        <p>We&apos;re preparing your access for this webinar.</p>
        <p>{isPending ? "You’ll be redirected as soon as your join link is ready." : "Redirecting..."}</p>
      </div>
    </div>
  );
}
