'use client';

import { useEffect } from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

// Vincula la fuente globalmente aprovechando next/font en vez de enlaces manuales.
export function FontPreloader() {
  useEffect(() => {
    document.body.classList.add(inter.className);
    return () => {
      document.body.classList.remove(inter.className);
    };
  }, []);

  return null;
}
