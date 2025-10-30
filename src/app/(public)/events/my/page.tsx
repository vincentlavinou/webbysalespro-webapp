"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";

/**
 * Local storage key used by registration flow to persist sessions.
 * Write to this key when a user finishes registering: 
 *   const list = JSON.parse(localStorage.getItem(KEY) || "[]");
 *   localStorage.setItem(KEY, JSON.stringify([...list, session]));
 */
const KEY = "webbysalespro.events.sessions";

interface Session {
  id: string;
  title: string;
  starts_at: string; // ISO
  presenter: string;
  cover_url?: string;
  join_url?: string; // optional deep-link to /go/<token>
}

export default function MyEventsPage() {
  const [sessions, setSessions] = useState<Session[] | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        setSessions([]);
        return;
      }
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSessions(parsed as Session[]);
      } else {
        localStorage.removeItem(KEY);
        setSessions([]);
      }
    } catch {
      localStorage.removeItem(KEY);
      setSessions([]);
    }
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100 transition-colors">
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            My Registered Events
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            These are the sessions saved on this device.
          </p>
        </div>

        {/* Content */}
        {sessions === null ? (
          <div className="grid place-items-center py-24 text-slate-500 dark:text-slate-400">
            Loading…
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {sessions.map((s) => (
              <Card
                key={s.id}
                className="overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow"
              >
                {s.cover_url && (
                  <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-800">
                    <Image
                      src={s.cover_url}
                      alt={s.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-base font-semibold line-clamp-2">
                    {s.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600 dark:text-slate-300">
                  <p className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                    {format(new Date(s.starts_at), "PPPp")}
                  </p>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    Hosted by {s.presenter}
                  </p>
                  {s.join_url && (
                    <p className="mt-3">
                      <Link
                        href={s.join_url}
                        className="text-slate-900 dark:text-slate-100 underline underline-offset-4 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        Open join link
                      </Link>
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-md text-center py-24">
      <CalendarDays className="mx-auto mb-4 h-10 w-10 text-slate-400 dark:text-slate-500" />
      <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-100">
        No events found on this device
      </h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        It looks like we don’t have any sessions saved locally yet. Please
        check your email inbox for messages from{" "}
        <span className="font-medium">WebbySalesPro Events</span> to find your
        personalized join links and details.
      </p>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        Tip: after you register from an email or event page, we’ll save it here
        automatically.
      </p>
    </div>
  );
}
