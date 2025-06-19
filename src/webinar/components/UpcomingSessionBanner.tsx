'use client'

import { DateTime, Duration } from 'luxon'
import { useEffect, useState } from 'react'
import { SeriesSession } from '@webinar/service' // Adjust as needed

interface UpcomingSessionBannerProps {
  session?: SeriesSession
}

export const UpcomingSessionBanner = ({ session }: UpcomingSessionBannerProps) => {
  const [timeLeft, setTimeLeft] = useState<Duration | null>(null)

  useEffect(() => {
    if(!session) return
    
    const interval = setInterval(() => {
      const now = DateTime.local()
      const sessionTime = DateTime.fromISO(session.scheduled_start, { zone: session.timezone || 'utc' })
      const diff = sessionTime.diff(now, ['days', 'hours', 'minutes', 'seconds'])

      if (diff.toMillis() <= 0) {
        setTimeLeft(null)
        clearInterval(interval)
      } else {
        setTimeLeft(diff)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [session])

  if (!timeLeft) return null

  if(!session) return null

  return (
    <div className="fixed bottom-16 inset-x-0 bg-indigo-600 text-white text-sm md:text-base z-50 shadow-lg px-4 py-3">
      <div className="flex justify-between items-center max-w-5xl mx-auto">
        <div>
          <p className="font-semibold">
            Upcoming Session: {DateTime.fromISO(session.scheduled_start, { zone: session.timezone || 'utc' }).toFormat("cccc, LLL d @ t ZZZZ")}
          </p>
        </div>
        <div className="font-mono text-xs md:text-sm text-white bg-indigo-700 px-3 py-1 rounded-md">
          Starts in: {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {Math.floor(timeLeft.seconds)}s
        </div>
      </div>
    </div>
  )
}
