'use client';

import { useEffect, useRef } from 'react';
import { useAnimation } from 'framer-motion';

interface PulseOptions {
  /** Total duration of the two-pulse sequence in seconds. Default: 0.75 */
  duration?: number;
  /** Minimum opacity during the low-intensity dips. Default: 0.25 */
  minOpacity?: number;
  /** Scale at the high-intensity peaks. Default: 1.03 */
  maxScale?: number;
}

/**
 * Returns framer-motion AnimationControls that fire a two-pulse sequence
 * (high → low → high → low → high) whenever any of the watched values change.
 *
 * Usage:
 *   const controls = usePulseOnChange(percentSold, availableCount);
 *   <motion.div animate={controls}>…</motion.div>
 */
export function usePulseOnChange(
  values: unknown[],
  options: PulseOptions = {}
): ReturnType<typeof useAnimation> {
  const { duration = 0.75, minOpacity = 0.25, maxScale = 1.03 } = options;

  const controls = useAnimation();
  const prevValuesRef = useRef<unknown[] | null>(null);

  useEffect(() => {
    const prev = prevValuesRef.current;

    if (prev !== null) {
      const changed = values.some((v, i) => v !== prev[i]);
      if (changed) {
        controls.start({
          opacity: [1, minOpacity, 1, minOpacity, 1],
          scale: [1, maxScale, 1, maxScale, 1],
          transition: { duration, ease: 'easeInOut' },
        });
      }
    }

    prevValuesRef.current = values;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, values);

  return controls;
}
