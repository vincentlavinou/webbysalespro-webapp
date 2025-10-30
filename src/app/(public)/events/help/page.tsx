"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlayCircle,
  RefreshCw,
  UserCircle,
  Video,
  LifeBuoy,
  Mail,
  ShieldCheck,
  BookOpen,
  LucideProps,
} from "lucide-react";
import { ForwardRefExoticComponent, RefAttributes } from "react";

export default function EventsHelpPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100 transition-colors">
      <div className="mx-auto max-w-6xl px-6 py-12 space-y-12">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">Help Center</h1>
          <p className="text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Welcome to the WebbySalesPro Events Help Center.  
            Whether you’re trying to join a session, watch a replay, or manage your account —  
            we’re here to guide you.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            asChild
            variant="outline"
            className="flex items-center gap-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
          >
            <Link href="/events/faq">
              <BookOpen className="h-4 w-4" /> View FAQ
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex items-center gap-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
          >
            <Link href="/contact">
              <Mail className="h-4 w-4" /> Contact Support
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex items-center gap-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
          >
            <Link href="/events/my">
              <Video className="h-4 w-4" /> My Events
            </Link>
          </Button>
        </div>

        {/* Help Categories */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <HelpCard
            icon={PlayCircle}
            title="Joining a Webinar"
            description="Learn how to use your personal join link and what to expect when entering an event."
            link="/events/faq#join"
          />
          <HelpCard
            icon={Video}
            title="Watching Replays"
            description="Missed a session? Find out when and how replays become available after the live broadcast."
            link="/events/faq#replay"
          />
          <HelpCard
            icon={UserCircle}
            title="Managing My Account"
            description="Update your profile, change your password, and access your saved webinars."
            link="/events/my"
          />
          <HelpCard
            icon={RefreshCw}
            title="Troubleshooting Issues"
            description="Fix common issues like video buffering, audio problems, or missing chat features."
            link="/events/faq#tech"
          />
          <HelpCard
            icon={ShieldCheck}
            title="Security & Privacy"
            description="Understand how WebbySalesPro keeps your data safe and your event links private."
            link="/events/faq#security"
          />
          <HelpCard
            icon={LifeBuoy}
            title="Still Need Help?"
            description="Can’t find the answer you need? Reach out to our friendly support team directly."
            link="/contact"
          />
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-slate-600 dark:text-slate-300 pt-6 border-t border-slate-200 dark:border-slate-800">
          For urgent issues, email us at{" "}
          <a
            href="mailto:support@webbysalespro.com"
            className="text-slate-900 dark:text-slate-100 font-medium underline underline-offset-4"
          >
            support@webbysalespro.com
          </a>
          . We’ll respond as soon as possible.
        </div>
      </div>
    </main>
  );
}

function HelpCard({
  icon: Icon,
  title,
  description,
  link,
}: {
  icon: ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;
  title: string;
  description: string;
  link: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <Link href={link}>
        <Card className="h-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-col items-start space-y-3 pb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
              <Icon className="h-5 w-5" />
            </div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {description}
            </p>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
