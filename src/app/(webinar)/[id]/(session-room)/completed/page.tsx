import { CheckCircle2 } from "lucide-react";
import { getPublicWebinarIdFromSessionAction } from "@/webinar/service/action";
import { getWebinar } from "@/webinar/service/action";
import { isWebinarPayload } from "@/webinar/service/guards";
import { WebinarDetailCard } from "@/webinar/components/WebinarDetailCard";

interface CompletedPageProps {
  params: Promise<{ id: string }>;
}

export default async function CompletedPage(props: CompletedPageProps) {
  const sessionId = (await props.params).id;

  // Use public endpoints — the join token is revoked when the session ends,
  // so we cannot use attendee-auth'd routes here.
  const idResult = await getPublicWebinarIdFromSessionAction({ session_id: sessionId });
  const webinar = idResult?.data
    ? await getWebinar(idResult.data.webinar_id).catch(() => null)
    : null;

  const payload = isWebinarPayload(webinar) ? webinar : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 text-foreground">
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">

          {/* Left — Webinar details */}
          <WebinarDetailCard
            webinar={payload}
            fallbackTitle="Webinar Session"
            badge={
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                Session Ended
              </span>
            }
          />

          {/* Right — Completion message */}
          <div className="order-first rounded-2xl border border-border bg-card/90 p-6 shadow-xl backdrop-blur-md md:order-last">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-primary/10">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Session Complete</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Thank you for attending. This session has now ended.
              </p>
            </div>

            <hr className="mb-5 border-border" />

            <div className="rounded-xl border border-border bg-muted/50 px-4 py-4 text-center">
              <p className="text-sm leading-relaxed text-muted-foreground">
                We hope you found this session valuable. Keep an eye on your inbox for a recording or follow-up from the presenter.
              </p>
            </div>
          </div>

        </div>
    </div>
  );
}
