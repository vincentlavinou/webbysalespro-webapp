import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useChatControl } from "../hooks/use-chat-control";
import { useChat } from "../hooks";

export function ChatControl() {
  const { recipient, setChatRecipient, options } = useChatControl();
  const { chatConfig } = useChat();
  const mode = chatConfig?.mode;

  // Public mode: recipient is fixed to Everyone — no choice needed
  if (mode === 'public') {
    return (
      <div className="flex gap-2 items-center">
        <Label>To:</Label>
        <Badge variant="secondary">Everyone</Badge>
      </div>
    );
  }

  // Private mode: attendees send only to the host/presenters — no choice needed
  if (mode === 'private') {
    return (
      <div className="flex gap-2 items-center">
        <Label>To:</Label>
        <Badge variant="secondary">Host &amp; Presenters</Badge>
      </div>
    );
  }

  // Fallback: show full recipient picker (e.g. host-side view or unknown mode)
  return (
    <div className="flex">
      <div className="flex gap-2 items-center">
        <Label>To:</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Badge className="cursor-pointer">{recipient.label}</Badge>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top">
            {options.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onSelect={() => setChatRecipient(option)}
                className="flex items-center justify-between"
              >
                <Badge>{option.label}</Badge>
                {recipient.value === option.value && <Check className="w-4 h-4 opacity-70" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
