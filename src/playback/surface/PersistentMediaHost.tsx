"use client";

/**
 * The always-mounted home of the persistent video element.
 *
 * Keeps WebRTC audio alive when the visible player unmounts during layout
 * switches or navigation: a renderer borrows the element into its own container
 * and hands it back here on cleanup, so the element itself is never destroyed.
 */
export function PersistentMediaHost({
  videoRef,
  hiddenHostRef,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hiddenHostRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={hiddenHostRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        width: 0,
        height: 0,
        overflow: "hidden",
        opacity: 0,
        pointerEvents: "none",
        zIndex: -9999,
      }}
    >
      <video ref={videoRef} playsInline style={{ width: 0, height: 0 }} />
    </div>
  );
}
