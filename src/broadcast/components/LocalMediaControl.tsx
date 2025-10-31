import { Button } from "@/components/ui/button";
import { SelectCamera, SelectMicrophone } from "./controls/Select";
import { useLocalMedia } from "../hooks/use-strategy";
import { ShareScreenButton } from "./controls/ShareScreenButton";
import { useBroadcastService } from "../hooks/use-broadcast-service";
import { ChartNoAxesColumnIncreasingIcon } from "lucide-react";
import { useBroadcastConfiguration } from "../hooks";
import { sessionController } from "../service";
import { useCallback, useState } from "react";
import { useStageContext } from "../hooks/use-stage";
import { usePresentation } from "../hooks/use-presentation";
import { PresentationPicker } from "./controls/PresentationPicker";
import { useVideoInjection } from "../hooks/use-video-injection";
import { VideoInjectionPicker } from "./controls/VideoInjectionPicker";
import { LocalStreamEventType } from "../service/enum";

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
  const { toggleScreenShare, isScreenSharing, toggleVideoInjection, sendStreamEvent } = useLocalMedia()
  const { token } = useBroadcastService()
  const { sessionId, seriesId, getRequestHeaders } = useBroadcastConfiguration()
  const [offerVisible, setOfferVisible] = useState<boolean>(false)
  const { isActive: presentationIsActive, setSelectedPresentation } = usePresentation()
  const { isActive: videoInjectionIsActive } = useVideoInjection()

  const toggleOffer = useCallback(async () => {
    if (getRequestHeaders) {
      await sessionController('toggle-offer', seriesId, sessionId, { visible: !offerVisible }, getRequestHeaders)
      sendStreamEvent(LocalStreamEventType.OFFER_EVENT, {
        "visible": !offerVisible
      })
      setOfferVisible(prev => !prev)
    }
  }, [offerVisible, setOfferVisible, getRequestHeaders])

  return (<div className="w-full flex flex-wrap gap-2 items-center justify-between">
    <div className="flex gap-2">
      {token?.role !== 'attendee' && <SelectCamera />}
      {token?.role !== 'attendee' && <SelectMicrophone />}
      {token?.role !== 'attendee' && isConnected && !presentationIsActive && !videoInjectionIsActive ? (
        <>
        {<ShareScreenButton onClick={toggleScreenShare} isConnected={isConnected} isSharing={isScreenSharing} />}
        </>
      ) : null}
      {token?.role !== 'attendee' && isConnected && !isScreenSharing && !videoInjectionIsActive ? (
        <>
          {presentationIsActive ? <Button onClick={() => setSelectedPresentation(undefined)}> Stop Presenting</Button> : <PresentationPicker />}
        </>
      ) : null}
      {token?.role !== 'attendee' && isConnected && !isScreenSharing && !presentationIsActive ? (
        <>
          {videoInjectionIsActive ? <Button onClick={() => toggleVideoInjection(undefined)}>
            Stop Video
          </Button> : <VideoInjectionPicker />}
        </>
      ) : null}
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