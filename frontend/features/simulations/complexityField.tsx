'use client';

import { useEffect, useRef, useState } from 'react';
import type { ComplexityPattern } from '@scipal/types';
import { usePalette } from './scene3d';
import styles from './complexity.module.css';

const HEIGHT = 260;
const PAD = 14;
/** Grids with more cells than this draw only what has been done, as dots. */
const MAX_EMPTY_CELLS = 1100;

type Palette = { accent: string; line: string; muted: string };
type Box = { x: number; y: number; w: number; h: number };

/** Where every cell of the pattern sits: a row of n items, a grid, the levels of a call tree. */
function layout(pattern: ComplexityPattern, n: number, total: number, width: number) {
  const w = width - PAD * 2;
  const h = HEIGHT - PAD * 2;
  const grid = (cols: number, rows: number) => {
    const size = Math.min(w / cols, h / rows, 44);
    const x0 = PAD + (w - size * cols) / 2;
    const y0 = PAD + (h - size * rows) / 2;
    return { cols, rows, size, at: (cell: number): Box => ({ x: x0 + (cell % cols) * size, y: y0 + Math.floor(cell / cols) * size, w: size, h: size }) };
  };
  switch (pattern) {
    case 'direct':
    case 'single-loop':
      return grid(n, 1);
    case 'divide-conquer':
      return grid(n, Math.max(1, Math.ceil(total / n)));
    case 'nested-loop':
      return grid(n, n);
    case 'permutations': {
      const cols = Math.max(1, Math.ceil(Math.sqrt((total * w) / h)));
      return grid(cols, Math.max(1, Math.ceil(total / cols)));
    }
    case 'halving':
    case 'branching':
      return null;
  }
}

function draw(ctx: CanvasRenderingContext2D, width: number, pattern: ComplexityPattern, n: number, ops: number[], shown: number, pal: Palette) {
  ctx.clearRect(0, 0, width, HEIGHT);
  const total = ops.length;
  // The newest operations glow; everything already done stays lit but quieter.
  const fresh = Math.max(1, Math.ceil(total / 120));
  const paint = (k: number, box: Box, round: number) => {
    const isNew = k >= shown - fresh;
    ctx.globalAlpha = isNew ? 1 : 0.55;
    ctx.shadowBlur = isNew ? 14 : 0;
    ctx.fillStyle = pal.accent;
    ctx.shadowColor = pal.accent;
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.w, box.h, round);
    ctx.fill();
  };
  ctx.shadowBlur = 0;

  if (pattern === 'halving') {
    const rowH = Math.min((HEIGHT - PAD * 2) / total, 30);
    const cell = (width - PAD * 2) / n;
    for (let k = 0; k < total; k += 1) {
      const y = PAD + k * rowH + rowH * 0.15;
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.fillStyle = pal.line;
      ctx.beginPath();
      ctx.roundRect(PAD, y, n * cell, rowH * 0.7, 4);
      ctx.fill();
      if (k < shown) paint(k, { x: PAD, y, w: (ops[k]! + 1) * cell, h: rowH * 0.7 }, 4);
    }
    ctx.globalAlpha = 1;
    return;
  }

  if (pattern === 'branching') {
    const depthH = (HEIGHT - PAD * 2) / Math.max(1, n);
    const pos = (node: number) => {
      const depth = Math.floor(Math.log2(node + 1));
      const slot = node + 1 - 2 ** depth;
      return { x: PAD + ((slot + 0.5) / 2 ** depth) * (width - PAD * 2), y: PAD + depth * depthH, depth };
    };
    ctx.strokeStyle = pal.muted;
    ctx.lineWidth = 1;
    for (let k = 0; k < shown; k += 1) {
      const node = ops[k]!;
      const p = pos(node);
      if (node > 0 && p.depth <= 7) {
        const parent = pos(Math.floor((node - 1) / 2));
        ctx.globalAlpha = 0.35;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(parent.x, parent.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      const r = Math.max(1, Math.min(7, (width - PAD * 2) / 2 ** p.depth / 3));
      paint(k, { x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 }, r);
    }
    ctx.globalAlpha = 1;
    return;
  }

  const g = layout(pattern, n, total, width)!;
  const gap = g.size > 8 ? Math.max(1, g.size * 0.12) : 0;
  const round = g.size > 8 ? g.size * 0.22 : 0;
  const inner = (box: Box): Box => ({ x: box.x + gap / 2, y: box.y + gap / 2, w: box.w - gap, h: box.h - gap });
  if (g.cols * g.rows <= MAX_EMPTY_CELLS) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = pal.line;
    for (let cell = 0; cell < g.cols * g.rows && cell < (pattern === 'permutations' ? total : Infinity); cell += 1) {
      const box = inner(g.at(cell));
      ctx.beginPath();
      ctx.roundRect(box.x, box.y, box.w, box.h, round);
      ctx.fill();
    }
  }
  for (let k = 0; k < shown; k += 1) {
    const cell = pattern === 'divide-conquer' ? Math.floor(k / n) * n + ops[k]! : ops[k]!;
    paint(k, inner(g.at(cell)), round);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

/** The operation field: one cell or dot per operation, lit as it happens. */
export function ComplexityField({ pattern, n, ops, shown, label }: { pattern: ComplexityPattern; n: number; ops: number[]; shown: number; label: string }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const pal = usePalette(host, { accent: '--accent', line: '--line', muted: '--ink-muted' });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry!.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx || !pal || width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    el.width = width * dpr;
    el.height = HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(ctx, width, pattern, n, ops, shown, pal);
  }, [pattern, n, ops, shown, pal, width]);

  return (
    <div ref={host} className="overflow-hidden rounded-md border border-line bg-surface-sunken text-[var(--accent,var(--action))]">
      <canvas key={`${pattern}-${n}`} ref={canvas} role="img" aria-label={label} className={`block w-full ${styles.arrive}`} style={{ height: HEIGHT }} />
    </div>
  );
}
