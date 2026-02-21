import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useChat } from "../hooks";

export function ChatControl() {
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
  return null
}
