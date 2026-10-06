// What each object of a 3D graph looks like inside the window, in math coordinates (z up).
// Expressions go through the shared safe parser; nothing here runs text as code.

import { evaluateGraphAt, graph3dExpressions, parseGraphExpression, type Graph3dObject, type GraphNode } from '@scipal/types';

export type Vec3 = [number, number, number];

/** Object colours in order, as theme tokens: blue, red-orange, green, amber, yellow; neighbours differ in hue. */
export const OBJECT_COLORS = ['--sky', '--coral', '--action', '--warning', '--sun'] as const;
export type ObjectColor = (typeof OBJECT_COLORS)[number];
export interface Box {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin: number;
  zMax: number;
}
type Message = { en: string; vi: string };

export type Shape =
  | { type: 'surface'; grid: Array<Array<Vec3 | null>> }
  | { type: 'curve'; segments: Vec3[][] }
  | { type: 'point'; at: Vec3; label: string }
  | { type: 'vector'; to: Vec3; label: string }
  | { type: 'plane'; polygon: Vec3[] }
  | { type: 'sphere'; center: Vec3; r: number }
  | { type: 'invalid'; field: string; message: Message };

const EPS = 1e-9;
const clean = (v: number) => Number(v.toFixed(10)) + 0;

function inside(p: Vec3, box: Box, slack = 1e-6): boolean {
  return p[0] >= box.xMin - slack && p[0] <= box.xMax + slack && p[1] >= box.yMin - slack && p[1] <= box.yMax + slack && p[2] >= box.zMin - slack && p[2] <= box.zMax + slack;
}

/** The polygon where a·x + b·y + c·z + d = 0 crosses the box, corners in order; empty if it misses. */
export function planeInBox(a: number, b: number, c: number, d: number, box: Box): Vec3[] {
  const xs = [box.xMin, box.xMax];
  const ys = [box.yMin, box.yMax];
  const zs = [box.zMin, box.zMax];
  const corners: Vec3[] = [];
  for (const x of xs) for (const y of ys) for (const z of zs) corners.push([x, y, z]);
  const f = (p: Vec3) => a * p[0] + b * p[1] + c * p[2] + d;
  const hits: Vec3[] = [];
  // The 12 edges join corners differing in one coordinate.
  for (let i = 0; i < 8; i += 1) {
    for (let j = i + 1; j < 8; j += 1) {
      const p = corners[i]!;
      const q = corners[j]!;
      const differ = [0, 1, 2].filter((k) => p[k] !== q[k]).length;
      if (differ !== 1) continue;
      const fp = f(p);
      const fq = f(q);
      if (Math.abs(fp) < EPS) hits.push(p);
      if ((fp < -EPS && fq > EPS) || (fp > EPS && fq < -EPS)) {
        const s = fp / (fp - fq);
        hits.push([p[0] + s * (q[0] - p[0]), p[1] + s * (q[1] - p[1]), p[2] + s * (q[2] - p[2])]);
      }
    }
  }
  const unique: Vec3[] = [];
  for (const h of hits) if (!unique.some((u) => Math.hypot(u[0] - h[0], u[1] - h[1], u[2] - h[2]) < 1e-7)) unique.push(h.map(clean) as Vec3);
  if (unique.length < 3) return [];
  // Order around the centre, measured in a basis of the plane.
  const n: Vec3 = [a, b, c];
  const helper: Vec3 = Math.abs(a) < 0.9 * Math.hypot(a, b, c) ? [1, 0, 0] : [0, 1, 0];
  const u = cross(n, helper);
  const v = cross(n, u);
  const centre = unique.reduce<Vec3>((acc, p) => [acc[0] + p[0] / unique.length, acc[1] + p[1] / unique.length, acc[2] + p[2] / unique.length], [0, 0, 0]);
  const angle = (p: Vec3) => {
    const w: Vec3 = [p[0] - centre[0], p[1] - centre[1], p[2] - centre[2]];
    return Math.atan2(dot(w, v), dot(w, u));
  };
  return unique.sort((p, q) => angle(p) - angle(q));
}

function cross(p: Vec3, q: Vec3): Vec3 {
  return [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
}
function dot(p: Vec3, q: Vec3): number {
  return p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
}

/** Parse every expression of an object, or say which one is wrong and why. */
function compile(object: Graph3dObject, parameters: string[]): { ok: true; ast: Record<string, GraphNode> } | { ok: false; field: string; message: Message } {
  const ast: Record<string, GraphNode> = {};
  for (const e of graph3dExpressions(object)) {
    const parsed = parseGraphExpression(e.source, parameters, e.variables);
    if (!parsed.ok) return { ok: false, field: e.field, message: parsed.error.message };
    ast[e.field] = parsed.ast;
  }
  return { ok: true, ast };
}

const NOWHERE: Message = { en: 'Some value is undefined here (a division by 0, a root of a negative…).', vi: 'Có giá trị không xác định (chia cho 0, căn số âm…).' };

export function buildShape(object: Graph3dObject, box: Box, samples: number, params: Readonly<Record<string, number>>): Shape {
  const compiled = compile(object, Object.keys(params));
  if (!compiled.ok) return { type: 'invalid', field: compiled.field, message: compiled.message };
  const { ast } = compiled;
  const value = (field: string, scope: Record<string, number> = {}) => evaluateGraphAt(ast[field]!, { ...params, ...scope });
  const vec = (fields: [string, string, string]): Vec3 | null => {
    const out = fields.map((f) => value(f));
    return out.every((v) => v !== null) ? (out.map((v) => clean(v!)) as Vec3) : null;
  };

  switch (object.type) {
    case 'surface': {
      const n = Math.min(Math.max(Math.round(samples), 2), 120);
      const grid: Array<Array<Vec3 | null>> = [];
      for (let j = 0; j <= n; j += 1) {
        const y = box.yMin + ((box.yMax - box.yMin) * j) / n;
        const row: Array<Vec3 | null> = [];
        for (let i = 0; i <= n; i += 1) {
          const x = box.xMin + ((box.xMax - box.xMin) * i) / n;
          const z = value('z', { x, y });
          row.push(z === null || z < box.zMin || z > box.zMax ? null : [clean(x), clean(y), clean(z)]);
        }
        grid.push(row);
      }
      return { type: 'surface', grid };
    }
    case 'curve': {
      const steps = 400;
      const segments: Vec3[][] = [];
      let current: Vec3[] = [];
      for (let i = 0; i <= steps; i += 1) {
        const t = object.tMin + ((object.tMax - object.tMin) * i) / steps;
        const p = [value('x', { t }), value('y', { t }), value('z', { t })];
        const point = p.every((v) => v !== null) ? (p.map((v) => clean(v!)) as Vec3) : null;
        if (!point || !inside(point, box)) {
          if (current.length > 1) segments.push(current);
          current = [];
          continue;
        }
        current.push(point);
      }
      if (current.length > 1) segments.push(current);
      return { type: 'curve', segments };
    }
    case 'point': {
      const at = vec(['x', 'y', 'z']);
      return at ? { type: 'point', at, label: object.label } : { type: 'invalid', field: 'x', message: NOWHERE };
    }
    case 'vector': {
      const to = vec(['x', 'y', 'z']);
      return to ? { type: 'vector', to, label: object.label } : { type: 'invalid', field: 'x', message: NOWHERE };
    }
    case 'plane': {
      const [a, b, c, d] = (['a', 'b', 'c', 'd'] as const).map((f) => value(f));
      if (a == null || b == null || c == null || d == null) return { type: 'invalid', field: 'a', message: NOWHERE };
      if (Math.hypot(a, b, c) < EPS) return { type: 'invalid', field: 'a', message: { en: 'a, b and c cannot all be 0.', vi: 'a, b, c không được cùng bằng 0.' } };
      return { type: 'plane', polygon: planeInBox(a, b, c, d, box) };
    }
    case 'sphere': {
      const center = vec(['x', 'y', 'z']);
      const r = value('r');
      if (!center || r === null) return { type: 'invalid', field: 'x', message: NOWHERE };
      if (r <= 0) return { type: 'invalid', field: 'r', message: { en: 'The radius must be positive.', vi: 'Bán kính phải dương.' } };
      return { type: 'sphere', center, r: clean(r) };
    }
  }
}
