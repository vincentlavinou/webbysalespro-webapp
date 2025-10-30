"use client";

import Link from "next/link";
import { MotionConfig, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MessageSquare, PlayCircle } from "lucide-react";

// Place at: app/(marketing)/events/page.tsx (attendee-focused)
// This page intentionally includes ONLY the Hero and How‑it‑Works sections.

export default function EventsLandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900">

        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 pb-16 pt-14 md:grid-cols-2 md:items-center lg:gap-12">
            <div>
              <Badge className="mb-4 bg-slate-900">Welcome to your events</Badge>
              <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
                Join live. Connect in chat. <span className="text-slate-500">Replay anytime.</span>
              </h1>
              <p className="mt-4 max-w-prose text-slate-600">
                You’re in the right place. When it’s time, use your personalized link to enter the room — no downloads
                needed. Ask questions, react in real time, and catch the replay if you miss anything.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/events/my">View my registered events</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/events/browse">Explore upcoming webinars</Link>
                </Button>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="grid gap-4">
                  <div className="flex items-center gap-3 rounded-xl border p-4">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100"><PlayCircle className="h-5 w-5" /></div>
                    <div>
                      <p className="text-sm font-medium">Live access</p>
                      <p className="text-sm text-slate-600">Your link takes you straight in — no installs.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border p-4">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100"><MessageSquare className="h-5 w-5" /></div>
                    <div>
                      <p className="text-sm font-medium">Interactive chat</p>
                      <p className="text-sm text-slate-600">Say hi, react, and ask questions in real time.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border p-4">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100"><CalendarDays className="h-5 w-5" /></div>
                    <div>
                      <p className="text-sm font-medium">Replays</p>
                      <p className="text-sm text-slate-600">Watch later if you can’t make it live.</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-t bg-white py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">How it works</h2>
              <p className="mt-3 text-slate-600">Three simple steps to a great experience.</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              <HowItem
                step={1}
                title="Open your link"
                desc="We email you a unique link. Click it when the event starts — that’s it."
              />
              <HowItem
                step={2}
                title="Join the conversation"
                desc="Chat with attendees, send reactions, and ask questions during Q&A."
              />
              <HowItem
                step={3}
                title="Watch the replay"
                desc="Couldn’t make it live? Replays are available when the host enables them."
              />
            </div>
          </div>
        </section>

      </main>
    </MotionConfig>
  );
}

function HowItem({ step, title, desc }: { step: number; title: string; desc: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border bg-white p-6 shadow-sm"
    >
      <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white text-sm font-semibold">
        {step}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{desc}</p>
    </motion.div>
  );
}
