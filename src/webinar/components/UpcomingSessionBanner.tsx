'use client'

import { DateTime, Duration } from 'luxon'
import { useEffect, useState, type CSSProperties } from 'react'
import { SeriesSession } from '@webinar/service' // Adjust as needed

interface UpcomingSessionBannerProps {
  session?: SeriesSession
  primaryColor?: string
  secondaryColor?: string
  buttonTextColor?: string
}

export const UpcomingSessionBanner = ({ session, primaryColor, secondaryColor, buttonTextColor }: UpcomingSessionBannerProps) => {
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

  const textColor = buttonTextColor ?? '#fff'
  const bannerStyle: CSSProperties | undefined = primaryColor
    ? { backgroundImage: `linear-gradient(to right, ${primaryColor}, ${secondaryColor ?? primaryColor})`, color: textColor }
    : undefined
  const pillStyle: CSSProperties | undefined = primaryColor
    ? { color: textColor, backgroundColor: `${textColor}26` }
    : undefined

  return (
    <div
      className={`fixed top-0 inset-x-0 text-sm md:text-base z-40 shadow-lg px-4 py-3 ${primaryColor ? '' : 'bg-gradient-to-r from-primary to-chart-2 text-white'}`}
      style={bannerStyle}
    >
      <div className="flex justify-between items-center max-w-5xl mx-auto">
        <div>
          <p className="font-semibold px-1">
            Upcoming Session: {DateTime.fromISO(session.scheduled_start, { zone: session.timezone || 'utc' }).toFormat("cccc, LLLL d yyyy, h:mm a")}
          </p>
          <p className="text-xs md:text-sm px-1 opacity-90">
            {DateTime.fromISO(session.scheduled_start, { zone: session.timezone || 'utc' }).offsetNameLong ?? session.timezone}
          </p>
        </div>
        <div
          className={`font-mono text-xs md:text-sm px-3 py-1 rounded-md ${primaryColor ? '' : 'text-white bg-primary/20'}`}
          style={pillStyle}
        >
          Starts in: {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {Math.floor(timeLeft.seconds)}s
        </div>
      </div>
    </div>
  )
}
