import { Button } from "@/components/ui/button";
import { SelectCamera, SelectMicrophone } from "./Select";
import { useStageContext } from "../context";
import { useLocalMedia } from "../hooks/use-strategy";
import { ShareScreenButton } from "./ShareScreenButton";
import { useBroadcastService } from "../hooks/use-broadcast-service";


export function LocalMediaControl() {

    const { isConnected, leave } = useStageContext();
    const {  toggleScreenShare , isScreenSharing} = useLocalMedia()
    const { token } = useBroadcastService()

    return (<div className="w-full flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          {token?.role !== 'attendee' && <SelectCamera />}
          {token?.role !== 'attendee' && <SelectMicrophone />}
          {token?.role !== 'attendee' && <ShareScreenButton onClick={toggleScreenShare} isConnected={isConnected} isSharing={isScreenSharing} />}
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