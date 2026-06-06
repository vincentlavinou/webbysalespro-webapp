const fieldWidths = ["w-20", "w-20", "w-28", "w-12"]

interface EmbedRegistrationLoadingProps {
  backgroundColor?: string
  primaryColor?: string
}

export function EmbedRegistrationCardLoading({ primaryColor }: Pick<EmbedRegistrationLoadingProps, "primaryColor">) {
  return (
    <div
      className="animate-pulse rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
      aria-busy="true"
      aria-label="Loading registration form"
    >
      <div className="mx-auto mb-5 h-4 w-52 rounded bg-gray-200" />

      <div className="space-y-4">
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <div className="h-4 w-72 max-w-full rounded bg-gray-200" />
          <div className="mt-2 h-4 w-56 max-w-[80%] rounded bg-gray-200" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {fieldWidths.slice(0, 2).map((width, index) => (
            <div className="space-y-2" key={index}>
              <div className={`h-4 rounded bg-gray-200 ${width}`} />
              <div className="h-10 rounded-md border border-gray-100 bg-gray-50" />
            </div>
          ))}
        </div>

        {fieldWidths.slice(2).map((width, index) => (
          <div className="space-y-2" key={index}>
            <div className={`h-4 rounded bg-gray-200 ${width}`} />
            <div className="h-10 rounded-md border border-gray-100 bg-gray-50" />
          </div>
        ))}

        <div
          className="h-12 w-full rounded-xl bg-emerald-100 opacity-30"
          style={primaryColor ? { backgroundColor: primaryColor } : undefined}
        />
      </div>
    </div>
  )
}

export function EmbedRegistrationLoading({
  backgroundColor,
  primaryColor,
}: EmbedRegistrationLoadingProps = {}) {
  return (
    <div
      className="min-h-[420px] bg-slate-50 p-4"
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <EmbedRegistrationCardLoading primaryColor={primaryColor} />
    </div>
  )
}
