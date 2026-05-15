'use client';

import { useEffect, useState } from 'react';

/** Re-renders periodically while `active` so elapsed-time UIs update. */
export function useProgressTick(active: boolean, intervalMs = 250) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setTick((n) => n + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs]);
}
