"use client";
import { useEffect, useRef, useState } from "react";

type Msg = { id: string; text: string };

export default function KeyboardSafariTestPage() {
  const [messages, setMessages] = useState<Msg[]>(
    () => Array.from({ length: 24 }, (_, i) => ({ id: String(i + 1), text: `Sample message ${i + 1}` }))
  );
  const [input, setInput] = useState("");

  const headerRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [headerH, setHeaderH] = useState(0);
  const [footerH, setFooterH] = useState(0);

  // Freeze a baseline viewport height that does NOT shrink with keyboard.
  const [vhBase, setVhBase] = useState<number>(() => 500);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // measure header/footer
  useEffect(() => {
    const measure = () => {
      setHeaderH(headerRef.current?.offsetHeight ?? 0);
      setFooterH(footerRef.current?.offsetHeight ?? 0);
    };
    measure();

    const roH = headerRef.current ? new ResizeObserver(measure) : null;
    const roF = footerRef.current ? new ResizeObserver(measure) : null;
    roH?.observe(headerRef.current!);
    roF?.observe(footerRef.current!);

    window.addEventListener("resize", measure);
    return () => {
      roH?.disconnect();
      roF?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // visualViewport handling:
  // - keep vhBase as the LARGEST height seen (ignores keyboard shrink)
  // - compute keyboardHeight as (vhBase - current visual height)
  useEffect(() => {
    const vv = window.visualViewport;

    const updateHeights = () => {
      const currentVH = (vv?.height ?? window.innerHeight) - (vv?.offsetTop ?? 0);
      setVhBase(prev => Math.max(prev, currentVH)); // freeze to largest
      setKeyboardHeight(Math.max(0, (vhBase || currentVH) - currentVH));
    };

    updateHeights();
    vv?.addEventListener("resize", updateHeights);
    vv?.addEventListener("scroll", updateHeights);
    window.addEventListener("resize", updateHeights);

    return () => {
      vv?.removeEventListener("resize", updateHeights);
      vv?.removeEventListener("scroll", updateHeights);
      window.removeEventListener("resize", updateHeights);
    };
  }, [vhBase]);

  // constant height between header and footer (doesn't shrink with keyboard)
  const betweenHF = Math.max(0, vhBase - headerH - footerH);

  // scroll helpers
  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  useEffect(() => { scrollToBottom(); }, []);
  useEffect(() => { requestAnimationFrame(scrollToBottom); }, [messages.length, footerH, keyboardHeight]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const id = crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    setMessages(m => [...m, { id, text }]);
    setInput("");
  };

  return (
    <div className="bg-neutral-900 text-neutral-100 h-[100svh] overflow-hidden">
      {/* HEADER (normal flow or fixed — both fine; we measure it either way) */}
      <header ref={headerRef} className="bg-black">
        <div className="w-full aspect-video grid place-items-center text-sm text-white/80">
          <div className="rounded-lg border border-white/10 px-3 py-1.5 bg-white/5">Video Placeholder</div>
        </div>
      </header>

      {/* MAIN: fixed height that DOES NOT change with keyboard; add bottom padding for lifted footer */}
      <main
        ref={scrollRef}
        className="px-3 space-y-2 overflow-y-auto overscroll-contain touch-pan-y"
        style={{
          height: betweenHF,                 // constant height
        }}
      >
        {messages.map(m => (
          <div key={m.id} className="max-w-[80%] rounded-xl bg-neutral-800 px-3 py-2">{m.text}</div>
        ))}
      </main>

      {/* FOOTER: lift by keyboard height */}
      <footer
        ref={footerRef}
        className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-neutral-900/95 backdrop-blur"
      >
        <div className="mx-auto w-full max-w-3xl p-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
              className="w-full rounded-lg border border-white/10 bg-neutral-800 px-3 py-3 outline-none focus:border-white/20"
              style={{ fontSize: 16 }}
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
