import { Button } from "@/components/ui/button";
import { SelectCamera, SelectMicrophone } from "./Select";
import { useLocalMedia } from "../hooks/use-strategy";
import { ShareScreenButton } from "./ShareScreenButton";
import { useBroadcastService } from "../hooks/use-broadcast-service";
import { ChartNoAxesColumnIncreasingIcon } from "lucide-react";
import { useBroadcastConfiguration } from "../hooks";
import { sessionController } from "../service";
import { useCallback, useState } from "react";
import { useStageContext } from "../hooks/use-stage";

interface LocalMediaControlProps {
  title?: string
}

function openSmallWindow(url: string) {
  // Define the window features (dimensions, scrollbars, etc.)
  const windowFeatures = 'width=1280,height=720,resizable=yes,scrollbars=yes';

  // Open the window
  window.open(url, '_blank', windowFeatures);
}

export function LocalMediaControl({ title }: LocalMediaControlProps) {

  const { isConnected, leave } = useStageContext();
  const { toggleScreenShare, isScreenSharing } = useLocalMedia()
  const { token } = useBroadcastService()
  const { sessionId, seriesId, getRequestHeaders } = useBroadcastConfiguration()
  const [offerVisible, setOfferVisible] = useState<boolean>(false)

  const toggleOffer = useCallback(async () => {
    if (getRequestHeaders) {
      await sessionController('toggle-offer', seriesId, sessionId, { visible: !offerVisible }, getRequestHeaders)
      setOfferVisible(prev => !prev)
    }
  }, [offerVisible, setOfferVisible, getRequestHeaders])

  return (<div className="w-full flex flex-wrap gap-2 items-center justify-between">
    <div className="flex gap-2">
      {token?.role !== 'attendee' && <SelectCamera />}
      {token?.role !== 'attendee' && <SelectMicrophone />}
      {token?.role !== 'attendee' && <ShareScreenButton onClick={toggleScreenShare} isConnected={isConnected} isSharing={isScreenSharing} />}
      {token?.role === 'attendee' && title && (
        <h1 className="text-2xl font-semibold tracking-tight">
          {title}
        </h1>
      )}
    </div>
    <div className="flex gap-4">
      {token?.role === 'host' && <Button
        variant="outline"
        disabled={!isConnected}
        onClick={() => {
          openSmallWindow(`/analytics/live?session=${token?.session.id}`)
          return false
        }} className='text-blue-500 hover:underline'>
        <ChartNoAxesColumnIncreasingIcon />Live Analytics
      </Button>}
      {token?.role === 'host' && token?.webinar?.offers?.length > 0 && <Button
        disabled={!isConnected}
        onClick={async () => {
          await toggleOffer()
        }}>
        {offerVisible ? "Hide Offer" : "Drop Offer!"}
      </Button>}
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