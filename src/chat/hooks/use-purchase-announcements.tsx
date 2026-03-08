'use client';

import { useEffect, useRef, useState } from 'react';
import { usePlaybackMetadataEvent } from '@/emitter/playback';
import { purchaseAnnouncementMetadataSchema } from '@/offer-client/service/schema';

export interface PurchaseAnnouncement {
  id: string;
  content: string;
  source: 'preset' | 'real';
  ttl_seconds: number | null;
  receivedAt: number;
}

let audioCtx: AudioContext | null = null;

/**
 * Called by the IVS player once its <video> element starts playing.
 * Using createMediaElementSource links the video's AVFoundation audio session
 * to the Web Audio graph, which prevents iOS from suspending the AudioContext
 * while video is playing. The source node is connected straight to destination
 * so the video audio still comes through normally.
 */
export function setSharedAudioContext(videoEl: HTMLVideoElement) {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    // createMediaElementSource can only be called once per element; guard against that.
    const source = audioCtx.createMediaElementSource(videoEl);
    source.connect(audioCtx.destination);
  } catch {
    // not available or already attached
  }
}

// ─── Sound variant selector ───────────────────────────────────────────────
// Change this number (1–4) to pick the win sound you want:
//   1 = Casino Coin Shower
//   2 = Level-Up Achievement
//   3 = Stadium Fanfare + Crowd
//   4 = Cash Register + Applause
const SOUND_VARIANT: 1 | 2 | 3 | 4 = 4;

function playTone(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  startTime: number,
  duration: number,
  gain: number,
  freqEnd?: number,
) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  if (freqEnd !== undefined) {
    osc.frequency.linearRampToValueAtTime(freqEnd, startTime + duration);
  }
  gainNode.gain.setValueAtTime(gain, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playNoise(
  ctx: AudioContext,
  startTime: number,
  duration: number,
  gain: number,
  lowFreq: number,
  highFreq: number,
) {
  const bufferSize = Math.ceil(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = (lowFreq + highFreq) / 2;
  bandpass.Q.value = (lowFreq + highFreq) / 2 / (highFreq - lowFreq);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gain, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  source.connect(bandpass);
  bandpass.connect(gainNode);
  gainNode.connect(ctx.destination);
  source.start(startTime);
  source.stop(startTime + duration);
}

/** Sound 1: Casino Coin Shower — coins + triumphant arpeggio (~2.5s) */
function playCasinoCoinShower(ctx: AudioContext) {
  const t = ctx.currentTime;
  // Rapid coin pings — metallic hits at random high freqs
  const coinFreqs = [2100, 2400, 1900, 2700, 2200, 1800, 2500, 2300, 2600, 1950, 2050, 2350];
  coinFreqs.forEach((freq, i) => {
    const offset = i * 0.12;
    playTone(ctx, 'sine', freq, t + offset, 0.18, 0.18);
    playTone(ctx, 'sine', freq * 1.5, t + offset + 0.02, 0.1, 0.08);
  });
  // Triumphant ascending arpeggio after coins
  const arpeggioNotes = [523, 659, 784, 1047, 1319];
  arpeggioNotes.forEach((freq, i) => {
    playTone(ctx, 'sine', freq, t + 1.5 + i * 0.18, 0.6, 0.3);
  });
}

/** Sound 2: Level-Up Achievement — ascending chime + sparkle (~2s) */
function playLevelUp(ctx: AudioContext) {
  const t = ctx.currentTime;
  // 4-note ascending chime
  const chimeNotes = [523, 659, 784, 1047];
  chimeNotes.forEach((freq, i) => {
    playTone(ctx, 'sine', freq, t + i * 0.18, 0.7, 0.35);
  });
  // Sparkle shimmer after chime
  const sparkleFreqs = [1568, 2093, 1760, 2637, 2093, 3136, 2349, 2637];
  sparkleFreqs.forEach((freq, i) => {
    playTone(ctx, 'sine', freq, t + 0.9 + i * 0.1, 0.18, 0.15);
  });
  // Sustained final chord swell
  [1047, 1319, 1568].forEach((freq) => {
    playTone(ctx, 'sine', freq, t + 1.8, 0.8, 0.2);
  });
}

/** Sound 3: Stadium Fanfare + Crowd (~2.5s) */
function playStadiumFanfare(ctx: AudioContext) {
  const t = ctx.currentTime;
  // Brass fanfare — sawtooth for horn-like timbre
  const fanfare: [number, number, number][] = [
    [392, 0.0, 0.15],
    [523, 0.15, 0.15],
    [659, 0.3, 0.15],
    [784, 0.45, 0.35],
    [784, 0.8, 0.15],
    [1047, 0.95, 0.55],
  ];
  fanfare.forEach(([freq, offset, dur]) => {
    playTone(ctx, 'sawtooth', freq, t + offset, dur, 0.18);
    playTone(ctx, 'sine', freq * 2, t + offset, dur, 0.06); // harmonic shine
  });
  // Crowd roar — filtered noise swell
  playNoise(ctx, t + 1.5, 1.0, 0.5, 300, 3000);
  // Crowd fade-in swell
  const crowdGain = ctx.createGain();
  crowdGain.gain.setValueAtTime(0, t + 1.5);
  crowdGain.gain.linearRampToValueAtTime(0.4, t + 2.0);
  crowdGain.gain.linearRampToValueAtTime(0.001, t + 2.5);
  crowdGain.connect(ctx.destination);
}

/** Sound 4: Cash Register + Applause (~2.5s) */
function playCashRegisterApplause(ctx: AudioContext) {
  const t = ctx.currentTime;
  // "Cha" — lower register hit
  playTone(ctx, 'sine', 660, t, 0.12, 0.3);
  playTone(ctx, 'sine', 440, t, 0.08, 0.2);
  // "Ching" — metallic ring
  playTone(ctx, 'sine', 1760, t + 0.08, 0.7, 0.35);
  playTone(ctx, 'sine', 2200, t + 0.08, 0.5, 0.18);
  playTone(ctx, 'sine', 3520, t + 0.08, 0.3, 0.08);
  // Applause — rhythmic noise bursts simulating clapping
  const clapOffsets = [1.0, 1.08, 1.16, 1.24, 1.35, 1.43, 1.51, 1.6, 1.7, 1.78];
  clapOffsets.forEach((offset) => {
    playNoise(ctx, t + offset, 0.07, 0.3, 800, 8000);
  });
  // Sustained applause wash underneath
  playNoise(ctx, t + 1.0, 1.2, 0.2, 400, 4000);
}

function playChingSound() {
  try {
    const ctx = audioCtx;
    if (!ctx || ctx.state === 'suspended') return;

    if (SOUND_VARIANT === 1) playCasinoCoinShower(ctx);
    else if (SOUND_VARIANT === 2) playLevelUp(ctx);
    else if (SOUND_VARIANT === 3) playStadiumFanfare(ctx);
    else playCashRegisterApplause(ctx);
  } catch {
    // silently fail if audio not available
  }
}

let announcementCounter = 0;

export function usePurchaseAnnouncements(sessionId?: string) {
  const [announcements, setAnnouncements] = useState<PurchaseAnnouncement[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

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

  return { announcements };
}
