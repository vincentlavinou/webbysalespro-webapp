import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LinkifiedText } from "./LinkifiedText";
import { Info, Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Staff roles worth calling out next to a name, and what to call them. Sourced
 * from `sender.attributes.role`, which the chat token endpoint stamps on every
 * participant (metadata['role'] in chat/serializers.py) — so this is the
 * backend's own answer, not a guess from the display name.
 *
 * Presenter is deliberately absent: the role is being wound down in favour of
 * cohost, so badging it would advertise something we're moving away from.
 */
const STAFF_ROLE_LABELS: Record<string, string> = {
  host: "Host",
  cohost: "Co-host",
};

export function staffRoleLabel(role?: string) {
  return role ? STAFF_ROLE_LABELS[role] : undefined;
}

interface Reaction {
  emoji: string;
  count: number;
}

interface ChatMessageProps {
  name: string;
  avatarUrl?: string;
  content: string;
  reactions?: Reaction[];
  isSelf?: boolean;
  avatarBgColor?: string
  isWarning?: boolean;
  warningMessage?: string;
  /** Raw `sender.attributes.role`; badged only for the roles in STAFF_ROLE_LABELS. */
  senderRole?: string;
}

export function ChatMessageBubble({
  name,
  avatarUrl,
  content,
  reactions = [],
  isSelf = false,
  avatarBgColor,
  isWarning = false,
  warningMessage,
  senderRole,
}: ChatMessageProps) {
  const staffLabel = staffRoleLabel(senderRole);
  return (
    <div className="flex items-center px-4 py-1 text-sx">
      {/* Avatar */}
      <Avatar className="h-6 w-6 mt-1 mr-2 shrink-0">
        <AvatarImage src={avatarUrl} />
        <AvatarFallback
          className={cn(
            // base styles
            "flex items-center justify-center text-xs font-medium rounded-full",
            // non-self fallback (if no color)
            !isSelf && !avatarBgColor && "bg-muted text-muted-foreground",
            // self fallback (if no color)
            isSelf && !avatarBgColor && "bg-primary text-primary-foreground",
          )}
          style={
            avatarBgColor
              ? {
                backgroundColor: avatarBgColor,
                color: isSelf ? "var(--primary-foreground)" : "var(--accent-foreground)", // optional tweak
              }
              : undefined
          }
        >
          {name?.[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>


      {/* Message Content */}
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "w-full min-w-0 break-words [overflow-wrap:anywhere] text-sm leading-snug",
            isWarning
              ? "rounded-md bg-amber-100/70 px-2 py-1 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
              : "text-foreground"
          )}
        >
          <span
            className={cn(
              "font-semibold whitespace-nowrap mr-1 inline-flex items-center gap-1",
              isWarning ? "text-amber-700 dark:text-amber-200" : isSelf ? "text-primary" : "text-foreground"
            )}
          >
            {isSelf ? "You" : name}
            {isWarning && warningMessage && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label="Why this message was blocked"
                    type="button"
                    className="inline-flex items-center text-amber-700 hover:text-amber-900 dark:text-amber-200 dark:hover:text-amber-100"
                  >
                    <Info className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent sideOffset={6} className="max-w-64">
                  {warningMessage}
                </TooltipContent>
              </Tooltip>
            )}
          </span>
          {staffLabel && (
            <Badge
              variant="outline"
              className="mr-1 h-5 gap-1 border-amber-400/40 bg-amber-400/10 px-1.5 align-middle text-[10px] font-medium text-amber-700 dark:text-amber-300"
            >
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
              {staffLabel}
            </Badge>
          )}
          <LinkifiedText
            className={cn(
              "whitespace-normal break-words [overflow-wrap:anywhere] [word-break:break-word]",
              isWarning && "underline decoration-dotted"
            )}
            text={content}
          />
        </div>

        {/* Reactions */}
        {reactions.length > 0 && (
          <div className="flex gap-2 mt-1 ml-1 text-xs text-muted-foreground">
            {reactions.map((r, i) => (
              <div key={i} className="flex items-center gap-1">
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
