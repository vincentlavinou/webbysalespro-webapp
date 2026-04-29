'use client'

import { useEffect, useRef } from 'react'

/**
 * Requests a screen wake lock so the device doesn't sleep while the component
 * is mounted. Re-acquires the lock whenever the page becomes visible again
 * (browsers drop the lock automatically on tab hide / screen off).
 */
export function useWakeLock() {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!('wakeLock' in navigator)) return

    async function acquire() {
      try {
        sentinelRef.current = await navigator.wakeLock.request('screen')
      } catch {
        // Permission denied or not supported — fail silently
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        acquire()
      }
    }

    acquire()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      sentinelRef.current?.release()
      sentinelRef.current = null
    }
  }, [])
}
