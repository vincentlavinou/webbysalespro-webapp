import { BrandMark } from "@/components/BrandMark"

export function WebinarFooter() {
  return (
    <footer className="py-6 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-5xl justify-between gap-4 px-4 sm:px-6">
        <BrandMark size="sm" />
        <span className="shrink-0 text-right text-sm text-muted-foreground">
          Webinar access and support
        </span>
      </div>
    </footer>
  )
}
