export const runtime = 'edge'

import { HoldingRoomPage } from '@/webinar/components/HoldingRoomPage'

export default function WaitingRoomPage() {
  return (
    <HoldingRoomPage
      loadingTitle="Opening waiting room..."
      presenceRoom="waiting_room_entered"
      roomLabel="Waiting Room"
    />
  )
}
