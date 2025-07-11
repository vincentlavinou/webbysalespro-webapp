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

export function ChatControl() {

  const {recipient, setChatRecipient, options} = useChatControl()

  return (
    <div className="flex">
      <div className="flex gap-2 items-center">
        <Label>To:</Label>
        <DropdownMenu >
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
