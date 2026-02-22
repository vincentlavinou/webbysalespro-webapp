import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { LinkifiedText } from "./LinkifiedText";

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
}

export function ChatMessageBubble({
  name,
  avatarUrl,
  content,
  reactions = [],
  isSelf = false,
  avatarBgColor
}: ChatMessageProps) {
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
      <div className="flex-1">
        <div className="w-full min-w-0 text-sm leading-snug text-foreground">
          <span
            className={cn(
              "font-semibold whitespace-nowrap mr-1",
              isSelf ? "text-primary" : "text-foreground"
            )}
          >
            {isSelf ? "You" : name}
          </span>
          <LinkifiedText className="break-all" text={content} />
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
