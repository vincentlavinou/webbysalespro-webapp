export default function WebinarNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
      <h1 className="text-2xl font-bold mb-3">This webinar no longer exists</h1>
      <p className="text-gray-600 max-w-sm">
        The link you followed may have expired or the event has been removed.
      </p>
    </div>
  );
}
