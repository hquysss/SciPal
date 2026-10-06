'use client';
import { useEffect, useRef } from 'react';
import { startBlackHoleAnimation } from './blackHoleAnimation';

type BlackHoleCanvasProps = { onReady: () => void; onFallback: () => void };

export function BlackHoleCanvas({ onReady, onFallback }: BlackHoleCanvasProps) {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = canvasHostRef.current;
    if (!container) return;
    return startBlackHoleAnimation(container, { onReady, onFallback });
  }, [onFallback, onReady]);
  return <div ref={canvasHostRef} className="scipal-black-hole-host" />;
}
