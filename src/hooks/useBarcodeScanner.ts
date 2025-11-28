'use client';

import { useEffect, useRef } from 'react';

type UseBarcodeScannerOptions = {
  onScan: (code: string) => void;
  enabled?: boolean;
  minLength?: number;
  debounceMs?: number;
};

export function useBarcodeScanner({
  onScan,
  enabled = true,
  minLength = 4,
  debounceMs = 80,
}: UseBarcodeScannerOptions) {
  const callbackRef = useRef(onScan);
  useEffect(() => {
    callbackRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return undefined;
    }

    let buffer = '';
    let lastTime = 0;

    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Shift') return;

      const now = Date.now();
      if (now - lastTime > debounceMs) {
        buffer = '';
      }

      if (event.key === 'Enter') {
        if (buffer.length >= minLength) {
          callbackRef.current(buffer);
        }
        buffer = '';
        return;
      }

      if (event.key.length === 1) {
        buffer += event.key;
        lastTime = now;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, minLength, debounceMs]);
}
