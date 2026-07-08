import Image from "next/image"
import Link from "next/link"

interface BrandMarkProps {
  href?: string
  className?: string
  textClassName?: string
  imageClassName?: string
  size?: "sm" | "md"
  showText?: boolean
}

export function BrandMark({
  href,
  className = "",
  textClassName = "",
  imageClassName = "",
  size = "md",
  showText = true,
}: BrandMarkProps) {
  const isSmall = size === "sm"
  const imageSize = isSmall ? 28 : 36
  const textSize = isSmall ? "text-sm" : "text-base"

  const content = (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <Image
        src="/logo.png"
        alt="WebbySalesPro"
        width={imageSize}
        height={imageSize}
        className={`rounded-md object-contain bg-white p-1 ring-1 ring-black/5 dark:bg-white ${imageClassName}`}
        priority
      />
      {showText && (
        <span className={`font-semibold tracking-tight text-foreground ${textSize} ${textClassName}`}>
          Webby<span className="text-primary dark:text-primary">Sales</span>Pro
        </span>
      )}
    </span>
  )

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center">
        {content}
      </Link>
    )
  }

  return content
}
