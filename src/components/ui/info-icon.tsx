import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info } from "lucide-react"

interface InfoIconProps {
  value: string
}

export function InfoIcon({ value }: InfoIconProps) {

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
            <Info className="w-4 h-4" />
        </TooltipTrigger>
        <TooltipContent side="top">
          {value}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
