'use client'

import { useState, useRef, useEffect } from 'react'
import { CalendarPlus, ChevronDown } from 'lucide-react'
import { DateTime } from 'luxon'

interface CalendarButtonProps {
  title: string
  description?: string
  startIso: string
  timezone: string
  /** Stable UID matching the email ICS — prevents duplicate calendar entries */
  uid: string
  /** Registration/join URL included in DESCRIPTION, URL, and LOCATION fields */
  url?: string
}

// RFC 5545 § 3.1 — fold at 75 octets, continuation lines begin with a space
function foldLine(value: string): string {
  const out: string[] = []
  let line = value
  while (new TextEncoder().encode(line).length > 75) {
    let cut = 73
    while (cut > 0 && new TextEncoder().encode(line.slice(0, cut)).length > 73) cut--
    out.push(line.slice(0, cut))
    line = ' ' + line.slice(cut)
  }
  out.push(line)
  return out.join('\r\n')
}

function escapeText(value: string): string {
  return (value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function toUtcZulu(iso: string, tz: string): string {
  return DateTime.fromISO(iso, { zone: tz }).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")
}

function nowUtcZulu(): string {
  return DateTime.utc().toFormat("yyyyMMdd'T'HHmmss'Z'")
}

function buildIcs({
  uid,
  title,
  startIso,
  timezone,
  description,
  url,
}: {
  uid: string
  title: string
  startIso: string
  timezone: string
  description?: string
  url?: string
}): string {
  const startUtc = toUtcZulu(startIso, timezone)
  const endUtc = DateTime.fromISO(startIso, { zone: timezone }).plus({ hours: 1 }).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")

  const resolvedUrl = url
    ? url.startsWith('http')
      ? url
      : `${window.location.origin}${url}`
    : undefined

  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//WebbySalesPro//EN',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowUtcZulu()}`,
    'SEQUENCE:1',
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(resolvedUrl || description || title)}`,
    ...(resolvedUrl ? [`URL:${escapeText(resolvedUrl)}`] : []),
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return lines.map(foldLine).join('\r\n') + '\r\n'
}

export default function CalendarButton({
  title,
  description,
  startIso,
  timezone,
  uid,
  url,
}: CalendarButtonProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const startDt = DateTime.fromISO(startIso, { zone: timezone })
  const endDt = startDt.plus({ hours: 1 })
  const startUtc = startDt.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")
  const endUtc = endDt.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'")

  const resolvedUrl = url
    ? typeof window !== 'undefined' && !url.startsWith('http')
      ? `${window.location.origin}${url}`
      : url
    : undefined

  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startUtc}/${endUtc}&details=${encodeURIComponent(resolvedUrl || description || '')}&ctz=${encodeURIComponent(timezone)}`

  function downloadIcs() {
    const ics = buildIcs({ uid, title, startIso, timezone, description, url })
    const blob = new Blob([ics], { type: 'text/calendar' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = 'webinar.ics'
    a.click()
    URL.revokeObjectURL(href)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-emerald-50 transition-colors w-full justify-center overflow-hidden"
      >
        {/* Pulse ring */}
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <CalendarPlus className="h-4 w-4 text-emerald-600" />
        Add to Calendar
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ml-auto ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 rounded-xl border border-gray-100 bg-white shadow-lg z-10 overflow-hidden">
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Google Calendar
          </a>
          <button
            onClick={downloadIcs}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-50"
          >
            <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Apple / Outlook (.ics)
          </button>
        </div>
      )}
    </div>
  )
}
