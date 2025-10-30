import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default function EventsFAQPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100 transition-colors">
      <div className="mx-auto max-w-4xl px-6 py-12 space-y-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            Quick answers to the most common attendee questions.
          </p>
        </div>

        {/* FAQ Card */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-6 transition-colors">
          <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="join">
              <AccordionTrigger className="text-base font-medium">
                How do I join my event?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                You’ll receive a personalized link by email when you register.
                Just click it a few minutes before start time—no app or download
                required. Your link is unique, so please don’t share it with
                others.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="email">
              <AccordionTrigger className="text-base font-medium">
                I can’t find my email or join link.
              </AccordionTrigger>
              <AccordionContent className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Check your spam or promotions folder for messages from{" "}
                <span className="font-medium">support@webbysalespro.com</span>.
                If you still can’t find it, contact{" "}
                <Link
                  href="/contact"
                  className="text-slate-900 dark:text-slate-100 underline underline-offset-4 font-medium"
                >
                  WebbySalesPro Support
                </Link>{" "}
                with the name and date of your event.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="replay">
              <AccordionTrigger className="text-base font-medium">
                Will I be able to watch the replay?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Yes—if the host enabled recording, replays are usually available
                within a few hours. You’ll receive a follow-up email once it’s
                ready, and you can also access it from your{" "}
                <Link
                  href="/events/my"
                  className="text-slate-900 dark:text-slate-100 underline underline-offset-4 font-medium"
                >
                  My Events
                </Link>{" "}
                page.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="timing">
              <AccordionTrigger className="text-base font-medium">
                What time should I join?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                You can join as soon as your event goes live—usually 5–10 minutes
                before the scheduled start. You’ll see a “waiting to start”
                screen until the host begins.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tech">
              <AccordionTrigger className="text-base font-medium">
                I’m having technical issues during the event.
              </AccordionTrigger>
              <AccordionContent className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Try refreshing your browser or switching to another device. We
                recommend using the latest version of Chrome, Safari, or Edge.
                If the issue continues, please visit{" "}
                <Link
                  href="/contact"
                  className="text-slate-900 dark:text-slate-100 underline underline-offset-4 font-medium"
                >
                  the contact page
                </Link>{" "}
                to let our support team know.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="security">
              <AccordionTrigger className="text-base font-medium">
                Is my information secure?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Absolutely. Your attendee link and data are token-gated and
                encrypted. WebbySalesPro follows strict privacy and security
                practices to keep your information safe.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* Quick help footer */}
        <div className="text-center text-sm text-slate-600 dark:text-slate-300">
          Still stuck?{" "}
          <Link
            href="/contact"
            className="text-slate-900 dark:text-slate-100 underline underline-offset-4 font-medium"
          >
            Contact our support team
          </Link>{" "}
          and we’ll get back to you as soon as possible.
        </div>
      </div>
    </main>
  );
}
