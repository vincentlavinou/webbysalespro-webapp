"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Mail, MessageCircle, ShieldQuestion } from "lucide-react";
import Link from "next/link";

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    // TODO: send to your support endpoint or email API
    setTimeout(() => setSubmitting(false), 1000);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Need help with your event?</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            If you’re having trouble joining a webinar, watching a replay, or managing your account,
            we’re here to help.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Form */}
          <Card className="md:col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader>
              <CardTitle>Contact Support</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Your Name
                  </label>
                  <Input
                    name="name"
                    required
                    placeholder="John Doe"
                    className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Email
                  </label>
                  <Input
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Message
                  </label>
                  <Textarea
                    name="message"
                    required
                    placeholder="Tell us what you’re running into..."
                    rows={5}
                    className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full md:w-auto"
                >
                  {submitting ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Helpful Links */}
          <div className="space-y-4">
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Info className="h-4 w-4" /> Common Issues
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
                <p>• Didn’t get your join link? Check your spam folder.</p>
                <p>• Link expired? The host may have closed registration.</p>
                <p>• Replay not loading? It might still be processing.</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Mail className="h-4 w-4" /> Email Us
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 dark:text-slate-300">
                Reach us at{" "}
                <a
                  href="mailto:support@webbysalespro.com"
                  className="text-slate-900 dark:text-slate-100 font-medium underline underline-offset-2"
                >
                  support@webbysalespro.com
                </a>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <MessageCircle className="h-4 w-4" /> Quick Help
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 dark:text-slate-300">
                <p>
                  Visit our{" "}
                  <Link
                    href="/events/help"
                    className="text-slate-900 dark:text-slate-100 font-medium underline"
                  >
                    Help Center
                  </Link>{" "}
                  or check the{" "}
                  <Link
                    href="/events/faq"
                    className="text-slate-900 dark:text-slate-100 font-medium underline"
                  >
                    FAQ
                  </Link>{" "}
                  for quick answers.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <ShieldQuestion className="h-4 w-4" /> Security Notice
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 dark:text-slate-300">
                WebiSalesPro staff will never ask for your password or private links. Always contact
                us through our official channels.
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
