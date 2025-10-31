import { Button } from "@/components/ui/button";
import { MonitorUp } from "lucide-react"; // or another icon you prefer


interface ShareScreenButtonProps {
    isConnected: boolean
    isSharing: boolean
    onClick: () => void
}
export function ShareScreenButton({isConnected, isSharing ,onClick}: ShareScreenButtonProps) {
    return (
        <Button
            onClick={onClick}
            disabled={!isConnected}
            variant="outline"
            className={isSharing ? "text-red-500" : "text-muted-foreground"}
            >
                <div className="flex items-center justify-center">
                    <MonitorUp className="mr-2 h-4 w-4" />
                </div>
        </Button>
    )
}