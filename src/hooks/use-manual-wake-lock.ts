'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type WakeLockStatus = 'idle' | 'active' | 'error' | 'unsupported'
type WakeLockMethod = 'wake-lock' | 'video' | null

const IOS_WAKE_LOCK_VIDEO_SRC = '/ios-wake-lock.mp4'

export function useManualWakeLock() {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const shouldStayAwakeRef = useRef(false)
  const [status, setStatus] = useState<WakeLockStatus>('idle')
  const [method, setMethod] = useState<WakeLockMethod>(null)

  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator

  const ensureFallbackVideo = useCallback(() => {
    if (videoRef.current) return videoRef.current

    const video = document.createElement('video')
    video.src = IOS_WAKE_LOCK_VIDEO_SRC
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.disableRemotePlayback = true
    video.setAttribute('playsinline', '')
    video.setAttribute('webkit-playsinline', 'true')
    video.setAttribute('muted', 'true')
    video.setAttribute('aria-hidden', 'true')
    video.tabIndex = -1
    video.style.position = 'fixed'
    video.style.width = '1px'
    video.style.height = '1px'
    video.style.opacity = '0'
    video.style.pointerEvents = 'none'
    video.style.bottom = '0'
    video.style.right = '0'

    video.onended = () => {
      if (!shouldStayAwakeRef.current) return
      void video.play().catch(() => {
        setStatus('error')
        setMethod(null)
      })
    }

    document.body.appendChild(video)
    videoRef.current = video

    return video
  }, [])

  const activateVideoFallback = useCallback(async () => {
    const video = ensureFallbackVideo()

    try {
      await video.play()
      setStatus('active')
      setMethod('video')
      return true
    } catch {
      setStatus(isSupported ? 'error' : 'unsupported')
      setMethod(null)
      return false
    }
  }, [ensureFallbackVideo, isSupported])

  const release = useCallback(async () => {
    shouldStayAwakeRef.current = false

    if (sentinelRef.current) {
      try {
        await sentinelRef.current.release()
      } catch {
        // Ignore release failures; the browser may have already released the lock.
      } finally {
        sentinelRef.current = null
      }
    }

    try {
      videoRef.current?.pause()
      if (videoRef.current) {
        videoRef.current.currentTime = 0
      }
    } catch {
    } finally {
      setStatus('idle')
      setMethod(null)
    }
  }, [])

  const request = useCallback(async () => {
    shouldStayAwakeRef.current = true

    if (isSupported) {
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        sentinelRef.current = sentinel
        setStatus('active')
        setMethod('wake-lock')

        sentinel.addEventListener('release', () => {
          sentinelRef.current = null
          if (shouldStayAwakeRef.current && document.visibilityState === 'visible') {
            setStatus('idle')
            setMethod(null)
            return
          }

          setStatus('idle')
          setMethod(null)
        })

        return true
      } catch {
        return activateVideoFallback()
      }
    }

    return activateVideoFallback()
  }, [activateVideoFallback, isSupported])

  useEffect(() => {
    async function handleVisibilityChange() {
      if (
        shouldStayAwakeRef.current &&
        document.visibilityState === 'visible'
      ) {
        if (sentinelRef.current || (videoRef.current && !videoRef.current.paused)) {
          return
        }

        await request()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      void release()
      videoRef.current?.remove()
      videoRef.current = null
    }
  }, [release, request])

  return {
    isActive: status === 'active',
    isSupported,
    method,
    request,
    release,
    status,
  }
}
