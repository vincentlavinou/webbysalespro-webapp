"use client";

import { Maximize2, Minimize2 } from "lucide-react";

type FullscreenOverlayButtonProps = {
  isVisible: boolean;
  isFullscreen?: boolean;
  onClick: () => void;
};

export function FullscreenOverlayButton({
  isVisible,
  isFullscreen = false,
  onClick,
}: FullscreenOverlayButtonProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-end p-3 transition-all duration-200 ease-out ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0"
      }`}
    >
      <button
        type="button"
        onPointerUp={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        className={`flex h-10 w-10 items-center justify-center rounded-2xl border border-white/18 bg-white/12 text-white shadow-[0_10px_30px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl transition-all duration-200 ease-out hover:scale-[1.03] hover:bg-white/18 focus:outline-none focus:ring-2 focus:ring-white/60 ${isVisible ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreen ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
