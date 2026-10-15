'use client';

import { useEffect, useRef, useState } from 'react';
import type { ComplexityPattern } from '@scipal/types';
import { animate, EASE, easeOutBack, MOTION } from './animation';
import { usePalette } from './scene3d';
import { pick, type Lang } from './types';
import styles from './complexity.module.css';

const HEIGHT = 260;
const PAD = 14;
/** Grids with more cells than this draw only what has been done, as dots. */
const MAX_EMPTY_CELLS = 1100;
/** Room between the groups a level of divide and conquer splits into. */
const GAP = 3;
/** The newest operations pop in; this many at most, so a flood still draws in a few paths. */
const POP_LIMIT = 60;
const POP_MS = 180;
/** How long the half a halving throws away takes to fall out of sight. */
const FALL_MS = 520;
/** How long a new call's edge takes to reach it. */
const GROW_MS = 220;
const SPARK_MS = 300;
const MAX_SPARKS = 150;

type Palette = { accent: string; line: string; muted: string; ink: string; surface: string };
type Box = { x: number; y: number; w: number; h: number };
/** When each operation lit up (performance.now()), so the field can draw what follows it. */
export type FieldFx = { now: number; litAt: ArrayLike<number> };
export type Spark = { x: number; y: number; vx: number; vy: number; born: number };

const centre = (box: Box) => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });
const scaled = (box: Box, s: number): Box => ({ x: box.x + (box.w * (1 - s)) / 2, y: box.y + (box.h * (1 - s)) / 2, w: box.w * s, h: box.h * s });

/** Where every cell of the pattern sits: a row of n items, a grid, the levels of a call tree. */
function layout(pattern: ComplexityPattern, n: number, total: number, width: number) {
  const w = width - PAD * 2;
  const h = HEIGHT - PAD * 2;
  const grid = (cols: number, rows: number, groupOf: (col: number, row: number) => number = () => 0, groups = 1) => {
    const room = (groups - 1) * GAP;
    const size = Math.min((w - room) / cols, h / rows, 44);
    const x0 = PAD + (w - size * cols - room) / 2;
    const y0 = PAD + (h - size * rows) / 2;
    return {
      cols,
      rows,
      size,
      at: (cell: number): Box => {
        const col = cell % cols;
        const row = Math.floor(cell / cols);
        return { x: x0 + col * size + groupOf(col, row) * GAP, y: y0 + row * size, w: size, h: size };
      },
    };
  };
  switch (pattern) {
    case 'direct':
    case 'single-loop':
      return grid(n, 1);
    case 'divide-conquer': {
      // Level l works on 2^l groups, drawn apart, the way the list was split.
      const levels = Math.max(1, Math.ceil(total / n));
      return grid(n, levels, (col, row) => Math.floor((col * 2 ** row) / n), 2 ** (levels - 1));
    }
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

/** Where the run is, in words under the field: "Vòng ngoài: lần 2/4 · vòng trong: lần 3/4". Null before the first operation. */
export function fieldCaption(pattern: ComplexityPattern, n: number, ops: readonly number[], shown: number, lang: Lang): string | null {
  if (shown === 0) return null;
  const t = pick(lang);
  const op = ops[shown - 1]!;
  const num = (v: number) => v.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');
  switch (pattern) {
    case 'direct':
      return t({ en: `Takes item ${op + 1} directly`, vi: `Lấy thẳng phần tử thứ ${op + 1}` });
    case 'halving':
      return t({ en: `${op + 1} items left`, vi: `Còn lại: ${op + 1} phần tử` });
    case 'single-loop':
      return t({ en: `Looking at item ${op + 1} of ${n}`, vi: `Đang xét phần tử thứ ${op + 1} / ${n}` });
    case 'divide-conquer': {
      const level = Math.floor((shown - 1) / n) + 1;
      const levels = ops.length / n;
      return t({ en: `Level ${level} of ${levels} · item ${op + 1}`, vi: `Tầng ${level} / ${levels} · phần tử thứ ${op + 1}` });
    }
    case 'nested-loop': {
      const row = Math.floor(op / n) + 1;
      const col = (op % n) + 1;
      return t({ en: `Outer loop: pass ${row} of ${n} · inner loop: pass ${col} of ${n}`, vi: `Vòng ngoài: lần ${row}/${n} · vòng trong: lần ${col}/${n}` });
    }
    case 'branching': {
      const depth = Math.floor(Math.log2(op + 1));
      return t({ en: `Depth ${depth} of ${n} · call ${num(shown)}`, vi: `Độ sâu ${depth} / ${n} · lời gọi thứ ${num(shown)}` });
    }
    case 'permutations':
      return t({ en: `Arrangement ${num(shown)} of ${num(ops.length)}`, vi: `Hoán vị thứ ${num(shown)} / ${num(ops.length)}` });
  }
}

/** A rounded box where the canvas can round it (older Safari cannot), a plain one otherwise. */
function shape(ctx: CanvasRenderingContext2D, box: Box, round: number) {
  if (round > 0 && typeof ctx.roundRect === 'function') ctx.roundRect(box.x, box.y, box.w, box.h, round);
  else ctx.rect(box.x, box.y, box.w, box.h);
}

/**
 * Draws the field in a few fills: the empty cells, the operations already done, and the newest
 * ones, which glow. One path per group keeps 40 320 operations inside a frame. With `fx` the
 * newest operations pop in and what follows them moves: a halving's dropped half falls, a new
 * call's edge grows. Returns the centre of the newest operation, where sparks start.
 */
export function drawField(ctx: CanvasRenderingContext2D, width: number, pattern: ComplexityPattern, n: number, ops: readonly number[], shown: number, pal: Palette, fx?: FieldFx): { x: number; y: number } | null {
  ctx.clearRect(0, 0, width, HEIGHT);
  const total = ops.length;
  const running = shown > 0 && shown < total;
  // How long ago operation k lit up; forever without effects or before it is stamped.
  const age = (k: number) => (fx ? fx.now - (fx.litAt[k] ?? -Infinity) : Infinity);
  let popFrom = shown;
  while (popFrom > Math.max(0, shown - POP_LIMIT) && age(popFrom - 1) < POP_MS) popFrom -= 1;
  const fresh = Math.min(popFrom, Math.max(0, shown - Math.max(1, Math.ceil(total / 120))));
  const group = (from: number, to: number, boxOf: (k: number) => Box, round: number, color: string, alpha: number, glow: number) => {
    if (to <= from) return;
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = glow;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let k = from; k < to; k += 1) shape(ctx, boxOf(k), round);
    ctx.fill();
  };
  const lit = (boxOf: (k: number) => Box, round: number) => {
    group(0, fresh, boxOf, round, pal.accent, 0.55, 0);
    group(fresh, popFrom, boxOf, round, pal.accent, 1, 14);
    // The newest grow in, overshooting a little before they settle.
    group(popFrom, shown, (k) => scaled(boxOf(k), easeOutBack(Math.min(1, Math.max(0, age(k) / POP_MS)))), round, pal.accent, 1, 14);
  };
  let newest: Box | null = null;

  if (pattern === 'halving') {
    const rowH = Math.min((HEIGHT - PAD * 2) / total, 30);
    const cell = (width - PAD * 2) / n;
    const row = (k: number, from: number, to: number): Box => ({ x: PAD + from * cell, y: PAD + k * rowH + rowH * 0.15, w: (to - from) * cell, h: rowH * 0.7 });
    group(0, total, (k) => row(k, 0, n), 4, pal.line, 1, 0);
    lit((k) => row(k, 0, ops[k]! + 1), 4);
    // Each cut drops the part it throws away: it falls, tips over and fades.
    ctx.shadowBlur = 0;
    ctx.fillStyle = pal.muted;
    for (let k = 1; k < shown; k += 1) {
      const t = age(k) / FALL_MS;
      if (!(t >= 0 && t < 1)) continue;
      const piece = row(k, ops[k]! + 1, ops[k - 1]! + 1);
      const c = centre(piece);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.translate(c.x, c.y + 900 * t * t);
      ctx.rotate(0.5 * t);
      ctx.beginPath();
      shape(ctx, { x: -piece.w / 2, y: -piece.h / 2, w: piece.w, h: piece.h }, 4);
      ctx.fill();
      ctx.restore();
    }
    if (shown > 0) newest = row(shown - 1, ops[shown - 1]!, ops[shown - 1]! + 1);
  } else if (pattern === 'branching') {
    const depthH = (HEIGHT - PAD * 2) / Math.max(1, n);
    const pos = (node: number) => {
      const depth = Math.floor(Math.log2(node + 1));
      const slot = node + 1 - 2 ** depth;
      return { x: PAD + ((slot + 0.5) / 2 ** depth) * (width - PAD * 2), y: PAD + depth * depthH, depth };
    };
    const parentOf = (node: number) => Math.floor((node - 1) / 2);
    // Edges only where the tree is still sparse enough to read; a new one grows out of its parent.
    ctx.globalAlpha = 0.35;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = pal.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 1; k < shown; k += 1) {
      const p = pos(ops[k]!);
      if (p.depth > 7) continue;
      const parent = pos(parentOf(ops[k]!));
      const t = Math.min(1, age(k) / GROW_MS);
      ctx.moveTo(parent.x, parent.y);
      ctx.lineTo(parent.x + (p.x - parent.x) * t, parent.y + (p.y - parent.y) * t);
    }
    ctx.stroke();
    if (running) {
      // The calls still open, from the first one down to the one running now: the call stack.
      ctx.globalAlpha = 1;
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let node = ops[shown - 1]!; node > 0; node = parentOf(node)) {
        const from = pos(parentOf(node));
        const to = pos(node);
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
      }
      ctx.stroke();
    }
    const dot = (k: number): Box => {
      const p = pos(ops[k]!);
      const r = Math.max(1, Math.min(7, (width - PAD * 2) / 2 ** p.depth / 3));
      return { x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 };
    };
    lit(dot, 3);
    if (shown > 0) newest = dot(shown - 1);
  } else {
    const g = layout(pattern, n, total, width)!;
    const gap = g.size > 8 ? Math.max(1, g.size * 0.12) : 0;
    const round = g.size > 8 ? g.size * 0.22 : 0;
    const inner = (box: Box): Box => ({ x: box.x + gap / 2, y: box.y + gap / 2, w: box.w - gap, h: box.h - gap });
    const cells = pattern === 'permutations' ? total : g.cols * g.rows;
    const cellOf = (k: number) => (pattern === 'divide-conquer' ? Math.floor(k / n) * n + ops[k]! : ops[k]!);
    if (cells <= MAX_EMPTY_CELLS) group(0, cells, (cell) => inner(g.at(cell)), round, pal.line, 1, 0);
    const current = running ? cellOf(shown - 1) : -1;
    if (pattern === 'nested-loop' && running) {
      // The outer loop's row, under the inner loop running along it.
      const start = g.at(current - (current % n));
      ctx.globalAlpha = 0.14;
      ctx.shadowBlur = 0;
      ctx.fillStyle = pal.accent;
      ctx.beginPath();
      ctx.rect(start.x, start.y, g.size * n, g.size);
      ctx.fill();
    }
    lit((k) => inner(g.at(cellOf(k))), round);
    if (pattern === 'nested-loop' && running) {
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      shape(ctx, scaled(inner(g.at(current)), 1.3), round);
      ctx.stroke();
    }
    if ((pattern === 'direct' || pattern === 'single-loop') && g.size >= 28) {
      // Only the newest cell is full accent; the dimmed ones read best in ink.
      const newestCell = shown > 0 ? ops[shown - 1]! : -1;
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.font = `600 ${Math.max(12, Math.round(g.size * 0.38))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let cell = 0; cell < g.cols; cell += 1) {
        const c = centre(inner(g.at(cell)));
        ctx.fillStyle = cell === newestCell ? pal.surface : pal.ink;
        ctx.fillText(String(cell + 1), c.x, c.y);
      }
    }
    if (shown > 0) newest = inner(g.at(cellOf(shown - 1)));
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  return newest ? centre(newest) : null;
}

/** Adds `count` sparks flying out of (x, y); the oldest go when there are more than 150. */
export function spawnSparks(pool: Spark[], x: number, y: number, now: number, count: number) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 140;
    pool.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 50, born: now });
  }
  if (pool.length > MAX_SPARKS) pool.splice(0, pool.length - MAX_SPARKS);
}

/** Draws the sparks still alive (300 ms each, falling a little as they fade), drops the rest, and says how many are left. */
export function drawSparks(ctx: CanvasRenderingContext2D, pool: Spark[], now: number, color: string): number {
  let alive = 0;
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  for (const spark of pool) {
    const t = (now - spark.born) / SPARK_MS;
    if (t >= 1) continue;
    pool[alive++] = spark;
    const s = Math.max(0, now - spark.born) / 1000;
    ctx.globalAlpha = 1 - Math.max(0, t);
    ctx.fillRect(spark.x + spark.vx * s - 1, spark.y + spark.vy * s + 240 * s * s - 1, 2, 2);
  }
  pool.length = alive;
  ctx.globalAlpha = 1;
  return alive;
}

/** The operation field: one cell or dot per operation, lit as it happens, with the motion that follows. */
export function ComplexityField({ pattern, n, ops, shown, label, reduced, milestone }: { pattern: ComplexityPattern; n: number; ops: number[]; shown: number; label: string; reduced: boolean; milestone: number }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const pal = usePalette(host, { accent: '--accent', line: '--line', muted: '--ink-muted', ink: '--ink', surface: '--surface' });
  const litAt = useRef(new Float64Array(0));
  const stamped = useRef(0);
  const lastStamp = useRef(-Infinity);
  const sparked = useRef(0);
  const sparks = useRef<Spark[]>([]);
  const frame = useRef(0);
  // What the next frame draws: the animation loop outlives the render that started it.
  const latest = useRef({ pattern, n, ops, shown, pal, width, reduced });
  latest.current = { pattern, n, ops, shown, pal, width, reduced };

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry!.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Resizing the backing store clears it, so it happens only when the width or the canvas changes.
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx || width === 0) return;
    const dpr = window.devicePixelRatio || 1;
    el.width = width * dpr;
    el.height = HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [width, pattern, n]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // A new pattern or n starts its timestamps and sparks afresh.
  useEffect(() => {
    litAt.current = new Float64Array(ops.length);
    stamped.current = 0;
    sparked.current = 0;
    sparks.current = [];
  }, [ops]);

  useEffect(() => {
    const now = performance.now();
    if (shown > stamped.current) {
      litAt.current.fill(now, stamped.current, shown);
      lastStamp.current = now;
    }
    if (shown < sparked.current) sparked.current = shown;
    stamped.current = shown;
    // Draws one frame and says whether anything is still moving.
    const paint = (time: number) => {
      const { pattern, n, ops, shown, pal, width, reduced } = latest.current;
      const ctx = canvas.current?.getContext('2d');
      if (!ctx || !pal || width === 0) return false;
      const fx = reduced ? undefined : { now: time, litAt: litAt.current };
      const at = drawField(ctx, width, pattern, n, ops, shown, pal, fx);
      if (!fx) return false;
      if (at && shown > sparked.current) spawnSparks(sparks.current, at.x, at.y, time, Math.min(3, shown - sparked.current));
      sparked.current = shown;
      return drawSparks(ctx, sparks.current, time, pal.accent) > 0 || time - lastStamp.current < FALL_MS;
    };
    // A running loop draws this change on its next frame; otherwise draw now, and loop while anything moves.
    if (frame.current) return;
    const loop = (time: number) => {
      frame.current = paint(time) ? requestAnimationFrame(loop) : 0;
    };
    if (paint(now)) frame.current = requestAnimationFrame(loop);
  }, [shown, ops, pal, width, reduced]);

  // Passing 1 000 and 10 000 operations jolts the frame once.
  useEffect(() => {
    if (milestone > 0 && !reduced) {
      animate(host.current, [{ transform: 'none' }, { transform: 'translateY(3px)', offset: 0.25 }, { transform: 'translateY(-2px)', offset: 0.6 }, { transform: 'none' }], { duration: MOTION.standard, easing: EASE.out });
    }
  }, [milestone, reduced]);

  return (
    <div ref={host} className="overflow-hidden rounded-md border border-line bg-surface-sunken text-[var(--accent,var(--action))]">
      <canvas key={`${pattern}-${n}`} ref={canvas} role="img" aria-label={label} className={`block w-full ${styles.arrive}`} style={{ height: HEIGHT }} />
    </div>
  );
}
