'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AssetPickerSheet, AssetThumbnail } from '@/components/ui/asset-picker-sheet'
import { Star, MonitorPlay } from 'lucide-react'
import { usePresentation } from '@/broadcast/hooks/use-presentation'
import { WebinarPresentation } from '@/broadcast/service/type'

function thumbFrom(item: WebinarPresentation) {
  const prefix = item?.assets_prefix?.replace(/\/$/, '')
  return prefix ? `${prefix}/preview.jpg` : null
}

export function PresentationPicker({
  trigger,
}: {
  trigger?: React.ReactNode
}) {
  const { setSelectedPresentation, selectedPresentation, presentations } = usePresentation()

  return (
    <AssetPickerSheet<WebinarPresentation>
      title="Presentations"
      trigger={trigger}
      triggerLabel="Presentations"
      triggerIcon={<MonitorPlay className="w-4 h-4 mr-2" />}
      items={presentations}
      searchPlaceholder="Search decks…"
      getItemKey={(p) => p.id}
      filterItem={(p, term) =>
        (p.title || '').toLowerCase().includes(term) ||
        (p.description || '').toLowerCase().includes(term) ||
        (p.original_filename || '').toLowerCase().includes(term)
      }
      renderItem={(p, { close }) => {
        const thumb = thumbFrom(p)
        const isCurrent = selectedPresentation?.id === p.id
        return (
          <Card className={isCurrent ? 'ring-2 ring-primary' : ''}>
            <CardContent className="p-3 flex items-start gap-3">
              <AssetThumbnail
                src={thumb}
                alt={`${p.title || 'Presentation'} preview`}
                overlay={
                  p.is_default_for_webinar && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] flex items-center gap-1">
                      <Star className="w-3 h-3" /> Default
                    </div>
                  )
                }
              />

              {/* Meta */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{p.title || '—'}</p>
                  {isCurrent && (
                    <span className="text-xs text-primary">Showing now</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">{p.description || 'No description'}</p>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {p.original_filename && <span>File: {p.original_filename}</span>}
                  {typeof p.file_size === 'number' && <span>Size: {(p.file_size / (1024 * 1024)).toFixed(1)} MB</span>}
                  {p.slide_count != null && <span>Slides: {p.slide_count}</span>}
                  <span>Status: {p.processed ? 'Processed' : 'Uploaded'}</span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedPresentation(p)
                      close()
                    }}
                  >
                    Show
                  </Button>

                  {p.download_url && (
                    <a
                      href={p.download_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs underline ml-2"
                    >
                      Open file
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
