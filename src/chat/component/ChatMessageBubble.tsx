import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
}

export function ChatMessageBubble({
  name,
  avatarUrl,
  content,
  reactions = [],
  isSelf = false,
}: ChatMessageProps) {
  return (
    <div className="flex items-center px-4 py-1 text-sx">
      {/* Avatar */}
      <Avatar className="h-6 w-6 mt-1 mr-2 shrink-0">
        <AvatarImage src={avatarUrl} />
        <AvatarFallback
          className={cn(
            "bg-muted text-muted-foreground",
            isSelf && "bg-primary text-primary-foreground"
          )}
        >
          {name[0]}
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
          <span className="break-all">{content}</span>
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
