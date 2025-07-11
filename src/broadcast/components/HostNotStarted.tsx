
import { PlayCircle } from "lucide-react";

export function HostNotStarted({ onStart }: { onStart: () => void }) {
  return (
    <div
      className="w-full h-[80vh] aspect-video rounded-md border overflow-hidden relative bg-black group cursor-pointer"
      onClick={onStart}
    >
      {/* Glass overlay */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-md flex items-center justify-center z-10 transition hover:bg-white/20">
        <div className="flex flex-col items-center justify-center text-white space-y-2">
          <PlayCircle className="w-16 h-16 text-white/80 group-hover:scale-105 group-active:scale-95 transition-transform" />
          <span className="text-lg font-medium text-white/90">Click to Start Broadcast</span>
        </div>
      </div>
    </div>
  );
}