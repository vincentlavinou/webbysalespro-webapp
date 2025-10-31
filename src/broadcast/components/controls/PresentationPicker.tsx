'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Star, MonitorPlay, Search } from 'lucide-react'
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
      const { setSelectedPresentation, selectedPresentation, presentations} = usePresentation()

  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return presentations
    return presentations.filter(i =>
      (i.title || '').toLowerCase().includes(term) ||
      (i.description || '').toLowerCase().includes(term) ||
      (i.original_filename || '').toLowerCase().includes(term)
    )
  }, [presentations, q])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="secondary">
            <MonitorPlay className="w-4 h-4 mr-2" /> Presentations
          </Button>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-[900px] p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle>Presentations</SheetTitle>
        </SheetHeader>

        {/* Toolbar */}
        <div className="p-4 flex items-center gap-2 border-b">
          <div className="relative w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search decks…"
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

          {filtered.map((p) => {
            const thumb = thumbFrom(p)
            const isCurrent = selectedPresentation?.id === p.id
            return (
              <Card key={p.id} className={isCurrent ? 'ring-2 ring-primary' : ''}>
                <CardContent className="p-3 flex items-start gap-3">
                  {/* Thumb */}
                  <div className="w-40 md:w-48 shrink-0">
                    <div className="relative w-full aspect-video rounded-md border overflow-hidden bg-muted">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt={`${p.title || 'Presentation'} preview`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-[11px] text-muted-foreground">
                          No preview
                        </div>
                      )}
                      {p.is_default_for_webinar && (
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] flex items-center gap-1">
                          <Star className="w-3 h-3" /> Default
                        </div>
                      )}
                    </div>
                  </div>

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
                          setSelectedPresentation(p)          // tell parent to show this deck
                          setOpen(false)       // close sheet
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
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
