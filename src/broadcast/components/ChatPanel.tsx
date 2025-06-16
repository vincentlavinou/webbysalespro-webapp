export function ChatPanel() {
    return (
      <div className="bg-white rounded-md border h-[80vh] p-4 flex flex-col justify-between shadow">
        <div className="flex-1 overflow-y-auto space-y-2">
          {/* Placeholder messages */}
          <div className="text-sm text-gray-600">No messages yet</div>
        </div>
        <div className="mt-2">
          <input
            type="text"
            placeholder="Type a message..."
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>
    );
  }
  