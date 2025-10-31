import { useEffect, useRef } from 'react'
import Hls from 'hls.js'

// Attach HLS if needed
export function useAttachVideo(src?: string, mimeType?: string): React.RefObject<HTMLVideoElement | null> {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        let hls: Hls | undefined
        const video = videoRef.current
        if (!video || !src) return

        const isHls =
            (mimeType?.includes('application/vnd.apple.mpegurl') ?? false) || src.endsWith('.m3u8')

        if (!isHls) {
            video.src = src
            video.load()
            return
        }

        const canNative =
            typeof video.canPlayType === 'function' &&
            video.canPlayType('application/vnd.apple.mpegurl') !== ''
        if (canNative) {
            video.src = src
            video.load()
            return
        }

        let cancelled = false
            ; (async () => {
                try {
                    const mod = await import('hls.js')
                    if (cancelled) return
                    const Hls = mod.default
                    if (Hls.isSupported()) {
                        hls = new Hls()
                        hls.loadSource(src)
                        hls.attachMedia(video)
                    } else {
                        video.src = src
                        video.load()
                    }
                } catch {
                    video.src = src
                    video.load()
                }
            })()

        return () => {
            cancelled = true
            if (hls) {
                try {
                    hls.destroy()
                } catch {
                    /* noop */
                }
            }
        }
    }, [src, mimeType])

    return videoRef
}