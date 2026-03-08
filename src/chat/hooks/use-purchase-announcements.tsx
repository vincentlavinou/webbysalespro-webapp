'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlaybackMetadataEvent } from '@/emitter/playback';
import { purchaseAnnouncementMetadataSchema } from '@/offer-client/service/schema';

export interface PurchaseAnnouncement {
  id: string;
  content: string;
  source: 'preset' | 'real';
  ttl_seconds: number | null;
  receivedAt: number;
}

function playChingSound() {
  try {
    const ctx = new AudioContext();

    const playTone = (freq: number, startTime: number, duration: number, gain: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gainNode.gain.setValueAtTime(gain, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // "cha" — lower hit
    playTone(880, ctx.currentTime, 0.15, 0.25);
    // "ching" — higher sustained ring
    playTone(1760, ctx.currentTime + 0.06, 0.5, 0.3);
    playTone(2200, ctx.currentTime + 0.06, 0.4, 0.15);

    setTimeout(() => ctx.close(), 800);
  } catch {
    // silently fail if audio not available
  }
}

let announcementCounter = 0;

export function usePurchaseAnnouncements(sessionId?: string) {
  const [announcements, setAnnouncements] = useState<PurchaseAnnouncement[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }, []);

  useEffect(() => {
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  usePlaybackMetadataEvent({
    eventType: 'session:offer:purchase_announcement',
    schema: purchaseAnnouncementMetadataSchema,
    sessionId,
    onEvent: (event) => {
      const { content, source, ttl_seconds } = event.payload;
      const id = `purchase-announcement-${++announcementCounter}`;

      playChingSound();

      setAnnouncements((prev) => [...prev, { id, content, source, ttl_seconds, receivedAt: Date.now() }]);

      if (ttl_seconds !== null) {
        const timer = setTimeout(() => {
          timersRef.current.delete(id);
          setAnnouncements((prev) => prev.filter((a) => a.id !== id));
        }, ttl_seconds * 1000);
        timersRef.current.set(id, timer);
      }
    },
  });

  return { announcements, dismiss };
}
