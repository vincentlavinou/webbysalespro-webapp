'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AssetPickerSheet, AssetThumbnail } from '@/components/ui/asset-picker-sheet'
import { Play, Film, Clock, MonitorPlay, ImageOff } from 'lucide-react'
import { notifyErrorUiMessage } from '@/lib/notify'
import { useVideoInjection } from '@/broadcast/hooks/use-video-injection'
import { useLocalMedia } from '@/broadcast/hooks/use-strategy'
import { getPlaybackUrl } from '@/broadcast/service/utils'
import type { WebinarVideoInjection } from '@/broadcast/service/type'

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
  const { videoInjections, selectedVideoInjection } = useVideoInjection()
  const { toggleVideoInjection } = useLocalMedia()

  return (
    <AssetPickerSheet<WebinarVideoInjection>
      title="Video injections"
      trigger={trigger}
      triggerLabel="Videos"
      triggerIcon={<MonitorPlay className="w-4 h-4 mr-2" />}
      items={videoInjections}
      searchPlaceholder="Search videos…"
      getItemKey={(v) => v.id}
      filterItem={(v, term) =>
        (v.title || '').toLowerCase().includes(term) ||
        (v.description || '').toLowerCase().includes(term)
      }
      renderItem={(v, { close }) => {
        const thumb = v.thumbnailUrl
        const isCurrent = selectedVideoInjection?.id === v.id
        const url = getPlaybackUrl(v)

        return (
          <Card className={isCurrent ? 'ring-2 ring-primary' : ''}>
            <CardContent className="p-3 flex items-start gap-3">
              <AssetThumbnail
                src={thumb}
                alt={`${v.title || 'Video'} preview`}
                fallback={
                  <div className="w-full h-full grid place-items-center text-[11px] text-muted-foreground">
                    <ImageOff className="w-4 h-4 mb-1" /> No preview
                  </div>
                }
                overlay={
                  v.status && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-background/90 text-foreground text-[10px] backdrop-blur border flex items-center gap-1">
                      <Film className="w-3 h-3" /> {v.status}
                    </div>
                  )
                }
              />

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
                        notifyErrorUiMessage('No playable URL yet')
                        return
                      }
                      toggleVideoInjection(v)
                      close()
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
      }}
    />
  )
}
