export default function RegistrationSuccessLoading() {
  return (
    <div className="max-w-2xl mx-auto mt-20 px-6 animate-pulse">
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="h-16 w-16 bg-gray-300 rounded-full" />

        <div className="h-6 w-2/3 bg-gray-300 rounded" />
        <div className="h-4 w-4/5 bg-gray-200 rounded" />

        <div className="w-full bg-gray-100 p-6 rounded-md space-y-3">
          <div className="h-4 w-1/2 bg-gray-300 rounded" />
          <div className="h-4 w-1/3 bg-gray-200 rounded" />
        </div>

        <div className="mt-6 flex gap-4">
          <div className="h-10 w-32 bg-gray-300 rounded-md" />
          <div className="h-10 w-32 bg-gray-200 rounded-md" />
        </div>
      </div>
    </div>
  )
}
