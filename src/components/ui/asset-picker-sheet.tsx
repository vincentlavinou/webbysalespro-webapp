'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { MonitorPlay, Search } from 'lucide-react'

export interface AssetPickerSheetProps<T> {
  title: string
  trigger?: ReactNode
  triggerLabel: string
  triggerIcon?: ReactNode
  items: T[]
  searchPlaceholder: string
  filterItem: (item: T, query: string) => boolean
  getItemKey: (item: T) => string | number
  renderItem: (item: T, helpers: { close: () => void }) => ReactNode
}

function AssetPickerSheet<T>({
  title,
  trigger,
  triggerLabel,
  triggerIcon,
  items,
  searchPlaceholder,
  filterItem,
  getItemKey,
  renderItem,
}: AssetPickerSheetProps<T>) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return items
    return items.filter((item) => filterItem(item, term))
  }, [items, q, filterItem])

  const close = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="secondary">
            {triggerIcon ?? <MonitorPlay className="w-4 h-4 mr-2" />} {triggerLabel}
          </Button>
        )}
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-[900px] p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        {/* Toolbar */}
        <div className="p-4 flex items-center gap-2 border-b">
          <div className="relative w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-8"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={close}>
            Close
          </Button>
        </div>

        {/* List */}
        <div className="p-4 space-y-3 overflow-y-auto" style={{ height: 'calc(100vh - 112px)' }}>
          {filtered.map((item) => (
            <div key={getItemKey(item)}>{renderItem(item, { close })}</div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function AssetThumbnail({
  src,
  alt,
  overlay,
  fallback,
}: {
  src?: string | null
  alt: string
  overlay?: ReactNode
  fallback?: ReactNode
}) {
  return (
    <div className="w-40 md:w-48 shrink-0">
      <div className="relative w-full aspect-video rounded-md border overflow-hidden bg-muted">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
          fallback ?? (
            <div className="w-full h-full grid place-items-center text-[11px] text-muted-foreground">
              No preview
            </div>
          )
        )}
        {overlay}
      </div>
    </div>
  )
}

export { AssetPickerSheet, AssetThumbnail }
