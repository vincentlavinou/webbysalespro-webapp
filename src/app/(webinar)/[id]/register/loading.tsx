
export default function DefaultRegistrationLoading(){
  return (
    <div className="max-w-xl mx-auto mt-10 px-6 animate-pulse space-y-6">
      {/* Thumbnail */}
      <div className="w-full h-[160px] bg-gray-300 rounded" />

      {/* Title & Description */}
      <div className="h-6 w-2/3 bg-gray-300 rounded" />
      <div className="h-4 w-full bg-gray-200 rounded" />

      {/* Select a session */}
      <div className="space-y-2">
        <div className="h-4 w-1/3 bg-gray-300 rounded" />
        <div className="h-10 w-full bg-gray-200 rounded-md" />
      </div>

      {/* Input Fields */}
      {[...Array(4)].map((_, idx) => (
        <div key={idx} className="space-y-2">
          <div className="h-4 w-1/3 bg-gray-300 rounded" />
          <div className="h-10 w-full bg-gray-200 rounded-md" />
        </div>
      ))}

      {/* Button */}
      <div className="h-10 w-24 bg-gray-300 rounded-md mx-auto" />
    </div>
  )
}
