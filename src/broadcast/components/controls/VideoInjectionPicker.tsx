'use client'

import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Play, Film, Clock, MonitorPlay, ImageOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useVideoInjection } from '@/broadcast/hooks/use-video-injection'
import { useLocalMedia } from '@/broadcast/hooks/use-strategy'
import { getPlaybackUrl } from '@/broadcast/service/utils'

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return '—'
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export interface VideoInjectionPickerProps {
  trigger?: React.ReactNode
}

export function VideoInjectionPicker({ trigger }: VideoInjectionPickerProps) {
  // If you have a broadcast hook, replace this local state with it.
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const {videoInjections, selectedVideoInjection} = useVideoInjection()
  const { toggleVideoInjection } = useLocalMedia()

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return videoInjections
    return videoInjections.filter((i) =>
      (i.title || '').toLowerCase().includes(term) ||
      (i.description || '').toLowerCase().includes(term)
    )
  }, [videoInjections, q])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="secondary">
            <MonitorPlay className="w-4 h-4 mr-2" /> Videos
          </Button>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-[900px] p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle>Video injections</SheetTitle>
        </SheetHeader>

        {/* Toolbar */}
        <div className="p-4 flex items-center gap-2 border-b">
          <div className="relative w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search videos…"
              className="pl-8"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>

        {/* List */}
        <div className="p-4 space-y-3 overflow-y-auto" style={{ height: 'calc(100vh - 112px)' }}>

          {filtered.map((v) => {
            const thumb = v.thumbnailUrl
            const isCurrent = selectedVideoInjection?.id === v.id
            const url = getPlaybackUrl(v)

            return (
              <Card key={v.id} className={isCurrent ? 'ring-2 ring-primary' : ''}>
                <CardContent className="p-3 flex items-start gap-3">
                  {/* Thumb */}
                  <div className="w-40 md:w-48 shrink-0">
                    <div className="relative w-full aspect-video rounded-md border overflow-hidden bg-muted">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt={`${v.title || 'Video'} preview`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-[11px] text-muted-foreground">
                          <ImageOff className="w-4 h-4 mb-1" /> No preview
                        </div>
                      )}
                      {v.status && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-background/90 text-foreground text-[10px] backdrop-blur border flex items-center gap-1">
                          <Film className="w-3 h-3" /> {v.status}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{v.title || '—'}</p>
                      {isCurrent && <span className="text-xs text-primary">Showing now</span>}
                      {v.isActive ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{v.description || 'No description'}</p>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {!!v.durationMs && <span><Clock className="inline h-3 w-3 mr-1" />{formatDuration(v.durationMs)}</span>}
                      {v.width && v.height && <span>{v.width}×{v.height}</span>}
                      {v.mimeType && <span>{v.mimeType}</span>}
                      {v.source && <span className="capitalize">{v.source}</span>}
                      {v.status && <span>Status: {v.status}</span>}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!url) {
                            toast.error('No playable URL yet')
                            return
                          }
                          toggleVideoInjection(v)
                          setOpen(false)
                        }}
                      >
                        <Play className="w-4 h-4 mr-2" /> Show
                      </Button>

                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs underline ml-2"
                        >
                          Open URL
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
