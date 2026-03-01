'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { WebinarVideoInjection } from '@/broadcast/service/type'
import { getPlaybackUrl } from '@/broadcast/service/utils'
import { useAttachVideo } from '@/broadcast/hooks/use-attach-video'


// ====================
// VideoInjectionView
// ====================
export interface VideoInjectionViewProps {
  /** Pass the item to render */
  injection: WebinarVideoInjection
  /** Control whether to show the player (e.g., tied to broadcast state) */
  active?: boolean
  /** Video tag conveniences */
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  controls?: boolean
}

export function VideoInjectionView({ injection, active = true, autoPlay = true, muted = true, loop = false, controls = true, }: VideoInjectionViewProps) {
  const url = useMemo(() => (active ? getPlaybackUrl(injection) : undefined), [injection, active])
  const poster = injection?.thumbnailUrl
  const ref = useAttachVideo(url, injection?.mimeType ?? undefined)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(false)
  }, [url])

  const show = Boolean(active && url)

  return (
    <div className={cn('w-full max-h-[80vh] aspect-video rounded-md border overflow-hidden relative bg-black group')}>
      {show ? (
        <video
          ref={ref}
          poster={poster}
          className="absolute inset-0 h-full w-full"
          playsInline
          controls={controls}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          onLoadedData={() => setReady(true)}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-sm text-white/80">
          {active ? 'No playable URL yet' : 'Video hidden'}
        </div>
      )}

      {show && !ready && (
        <div className="absolute inset-0 grid place-items-center text-xs text-white/80">
          Loading video…
        </div>
      )}
    </div>
  )
}
