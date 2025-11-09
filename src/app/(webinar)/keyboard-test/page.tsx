"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { id: string; text: string };

export default function KeyboardSafariTestPage() {
  const [messages, setMessages] = useState<Msg[]>(() =>
    Array.from({ length: 24 }, (_, i) => ({
      id: String(i + 1),
      text: `Sample message ${i + 1}`,
    }))
  );
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const lastOverlapRef = useRef(0);

  // 1) Track keyboard overlap using visualViewport (iOS) and snap back to top when it closes
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleViewportChange = () => {
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      lastOverlapRef.current = overlap;

      setKeyboardHeight(overlap);
    };

    handleViewportChange();
    vv.addEventListener("resize", handleViewportChange);
    vv.addEventListener("scroll", handleViewportChange);

    return () => {
      vv.removeEventListener("resize", handleViewportChange);
      vv.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  // 2) Scroll to bottom helper for messages
  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    scrollToBottom();
  }, []);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const id = crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    setMessages((m) => [...m, { id, text }]);
    setInput("");
    requestAnimationFrame(scrollToBottom);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100">
      {/* VIDEO: normal header; we just make sure page is scrolled to top after keyboard closes */}
      <header className="bg-black w-full fixed">
        <div className="w-full aspect-video grid place-items-center text-sm text-white/80">
          <div className="rounded-lg border border-white/10 px-3 py-1.5 bg-white/5">
            Video Placeholder (aspect-video)
          </div>
        </div>
      </header>

      {/* MESSAGES: normal scrolling, just reserve space at the bottom for the fixed composer */}
      <main
        ref={scrollRef}
        className="px-3 pt-[230px] pb-24 space-y-2 overflow-y-auto"
        style={{
          // crude but fine for testing: viewport height minus approx header height
          maxHeight: "calc(100vh - 56px)",
        }}
      >
        {messages.map((m) => (
          <div key={m.id} className="max-w-[80%] rounded-xl bg-neutral-800 px-3 py-2">
            {m.text}
          </div>
        ))}
      </main>

      {/* COMPOSER: fixed to viewport bottom, shifted up by keyboard height so it hugs keyboard */}
      <footer
        className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-neutral-900/95 backdrop-blur"
        style={{
          transform: `translateY(${-keyboardHeight}px)`,
          transition: "transform 180ms ease-out",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="mx-auto w-full max-w-3xl p-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  send();
                }
              }}
              className="w-full rounded-lg border border-white/10 bg-neutral-800 px-3 py-3 outline-none focus:border-white/20"
              style={{ fontSize: 16 }} // avoid iOS zoom-on-focus
              placeholder="Type a message…"
              inputMode="text"
              autoComplete="off"
            />
            <button
              onClick={send}
              className="shrink-0 rounded-lg px-4 py-3 font-medium text-neutral-900"
              style={{ background: "#25D366" }}
            >
              Send
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
