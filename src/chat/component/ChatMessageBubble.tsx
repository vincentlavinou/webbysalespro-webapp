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
  time: string;
  reactions?: Reaction[];
  isSelf?: boolean;
}

export function ChatMessageBubble({
  name,
  avatarUrl,
  content,
  time,
  reactions = [],
  isSelf = false,
}: ChatMessageProps) {
  return (
    <div className="flex gap-3 items-start px-4 py-2">
      <Avatar className="h-8 w-8 mt-1">
        <AvatarImage src={avatarUrl} />
        <AvatarFallback>{name[0]}</AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-gray-900">{isSelf ? "You" : name}</span>
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>

        <div
          className={cn(
            "mt-1 inline-block px-3 py-2 rounded-xl text-sm max-w-[75%] whitespace-pre-wrap",
            isSelf
              ? "bg-blue-100 text-gray-900"
              : "bg-gray-100 text-gray-900"
          )}
        >
          {content}
        </div>

        {reactions.length > 0 && (
          <div className="flex gap-3 mt-1 ml-1 text-sm">
            {reactions.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-1 text-sm text-gray-700"
              >
                <span>{r.emoji}</span>
                <span className="text-xs">{r.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
