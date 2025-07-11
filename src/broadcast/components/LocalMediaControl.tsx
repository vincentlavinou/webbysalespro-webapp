import { Button } from "@/components/ui/button";
import { SelectCamera, SelectMicrophone } from "./Select";
import { useStageContext } from "../context";
import { useLocalMedia } from "../hooks/use-strategy";
import { ShareScreenButton } from "./ShareScreenButton";
import { useBroadcastService } from "../hooks/use-broadcast-service";

interface LocalMediaControlProps {
  title?: string
}

export function LocalMediaControl({title}: LocalMediaControlProps) {

    const { isConnected, leave } = useStageContext();
    const {  toggleScreenShare , isScreenSharing} = useLocalMedia()
    const { token } = useBroadcastService()

    return (<div className="w-full flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          {token?.role !== 'attendee' && <SelectCamera />}
          {token?.role !== 'attendee' && <SelectMicrophone />}
          {token?.role !== 'attendee' && <ShareScreenButton onClick={toggleScreenShare} isConnected={isConnected} isSharing={isScreenSharing} />}
          {token?.role === 'attendee' && title &&(
            <h1 className="text-2xl font-semibold tracking-tight">
              {title}
            </h1>
          )}
        </div>
        <div>
          <Button
            variant="destructive"
            disabled={!isConnected}
            onClick={leave}
          >
            Leave
          </Button>
        </div>

      </div>
    )
}