// Solids of grade 11–12 geometry in textbook coordinates: A at the origin, the base in z = 0, z up.
// Pure data, so the Oxyz table, the formulas and the 3D scene all read the same numbers.

export type SolidKind = 'cube' | 'cuboid' | 'tetrahedron' | 'pyramid' | 'prism' | 'cylinder' | 'cone' | 'sphere';
export type Vec3 = [number, number, number];
export interface Dims {
  a: number;
  b: number;
  c: number;
  h: number;
  r: number;
}
export type DimKey = keyof Dims;

export interface Solid {
  /** Named points in display order: vertices first, then helpers such as O. */
  points: Record<string, Vec3>;
  edges: Array<[string, string]>;
  /** Each face as its vertex names, in order around the face. */
  faces: string[][];
  round?: { type: 'cylinder' | 'cone' | 'sphere'; r: number; h: number };
}

export interface Measure {
  key: 'volume' | 'area' | 'lateral';
  label: { vi: string; en: string };
  formula: string;
  value: number;
}

const DIMS: Record<SolidKind, DimKey[]> = {
  cube: ['a'],
  cuboid: ['a', 'b', 'c'],
  tetrahedron: ['a'],
  pyramid: ['a', 'h'],
  prism: ['a', 'h'],
  cylinder: ['r', 'h'],
  cone: ['r', 'h'],
  sphere: ['r'],
};

/** The lengths a solid is built from, in the order the editor and sliders show them. */
export function dimsUsed(kind: SolidKind): DimKey[] {
  return DIMS[kind];
}

export function distance(p: Vec3, q: Vec3): number {
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

const round = (v: number) => Number(v.toFixed(10)) + 0;
const v3 = (x: number, y: number, z: number): Vec3 => [round(x), round(y), round(z)];

/** The bottom face and its copy lifted by `height`, named X and X′, joined by vertical edges. */
function prismOver(base: Record<string, [number, number]>, height: number): Solid {
  const names = Object.keys(base);
  const points: Record<string, Vec3> = {};
  for (const n of names) points[n] = v3(base[n]![0], base[n]![1], 0);
  for (const n of names) points[`${n}'`] = v3(base[n]![0], base[n]![1], height);
  const edges: Array<[string, string]> = [];
  names.forEach((n, i) => {
    const next = names[(i + 1) % names.length]!;
    edges.push([n, next], [`${n}'`, `${next}'`], [n, `${n}'`]);
  });
  const faces = [names, names.map((n) => `${n}'`)];
  names.forEach((n, i) => {
    const next = names[(i + 1) % names.length]!;
    faces.push([n, next, `${next}'`, `${n}'`]);
  });
  return { points, edges, faces };
}

export function solid(kind: SolidKind, d: Dims): Solid {
  switch (kind) {
    case 'cube':
      return prismOver({ A: [0, 0], B: [d.a, 0], C: [d.a, d.a], D: [0, d.a] }, d.a);
    case 'cuboid':
      return prismOver({ A: [0, 0], B: [d.a, 0], C: [d.a, d.b], D: [0, d.b] }, d.c);
    case 'prism':
      return prismOver({ A: [0, 0], B: [d.a, 0], C: [d.a / 2, (d.a * Math.sqrt(3)) / 2] }, d.h);
    case 'tetrahedron': {
      const points = {
        A: v3(0, 0, 0),
        B: v3(d.a, 0, 0),
        C: v3(d.a / 2, (d.a * Math.sqrt(3)) / 2, 0),
        D: v3(d.a / 2, (d.a * Math.sqrt(3)) / 6, d.a * Math.sqrt(2 / 3)),
      };
      return {
        points,
        edges: [['A', 'B'], ['B', 'C'], ['C', 'A'], ['A', 'D'], ['B', 'D'], ['C', 'D']],
        faces: [['A', 'B', 'C'], ['A', 'B', 'D'], ['B', 'C', 'D'], ['C', 'A', 'D']],
      };
    }
    case 'pyramid': {
      const points = {
        A: v3(0, 0, 0),
        B: v3(d.a, 0, 0),
        C: v3(d.a, d.a, 0),
        D: v3(0, d.a, 0),
        S: v3(d.a / 2, d.a / 2, d.h),
        O: v3(d.a / 2, d.a / 2, 0),
      };
      return {
        points,
        edges: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'], ['S', 'A'], ['S', 'B'], ['S', 'C'], ['S', 'D']],
        faces: [['A', 'B', 'C', 'D'], ['S', 'A', 'B'], ['S', 'B', 'C'], ['S', 'C', 'D'], ['S', 'D', 'A']],
      };
    }
    case 'cylinder':
      return { points: { O: v3(0, 0, 0), "O'": v3(0, 0, d.h) }, edges: [], faces: [], round: { type: 'cylinder', r: d.r, h: d.h } };
    case 'cone':
      return { points: { S: v3(0, 0, d.h), O: v3(0, 0, 0) }, edges: [], faces: [], round: { type: 'cone', r: d.r, h: d.h } };
    case 'sphere':
      return { points: { O: v3(0, 0, 0) }, edges: [], faces: [], round: { type: 'sphere', r: d.r, h: 2 * d.r } };
  }
}

const VOLUME = { vi: 'Thể tích', en: 'Volume' };
const AREA = { vi: 'Diện tích toàn phần', en: 'Total surface area' };
const LATERAL = { vi: 'Diện tích xung quanh', en: 'Lateral area' };

export function measures(kind: SolidKind, d: Dims): Measure[] {
  const { a, b, c, h, r } = d;
  switch (kind) {
    case 'cube':
      return [
        { key: 'volume', label: VOLUME, formula: 'V = a³', value: a ** 3 },
        { key: 'area', label: AREA, formula: 'S = 6a²', value: 6 * a * a },
      ];
    case 'cuboid':
      return [
        { key: 'volume', label: VOLUME, formula: 'V = abc', value: a * b * c },
        { key: 'area', label: AREA, formula: 'S = 2(ab + bc + ca)', value: 2 * (a * b + b * c + c * a) },
      ];
    case 'tetrahedron':
      return [
        { key: 'volume', label: VOLUME, formula: 'V = a³√2 / 12', value: (a ** 3 * Math.SQRT2) / 12 },
        { key: 'area', label: AREA, formula: 'S = a²√3', value: a * a * Math.sqrt(3) },
      ];
    case 'pyramid': {
      const l = Math.sqrt(h * h + (a / 2) ** 2);
      return [
        { key: 'volume', label: VOLUME, formula: 'V = ⅓·a²·h', value: (a * a * h) / 3 },
        { key: 'lateral', label: LATERAL, formula: 'S_xq = 2a·√(h² + a²/4)', value: 2 * a * l },
        { key: 'area', label: AREA, formula: 'S = a² + S_xq', value: a * a + 2 * a * l },
      ];
    }
    case 'prism': {
      const base = (a * a * Math.sqrt(3)) / 4;
      return [
        { key: 'volume', label: VOLUME, formula: 'V = (a²√3 / 4)·h', value: base * h },
        { key: 'lateral', label: LATERAL, formula: 'S_xq = 3a·h', value: 3 * a * h },
        { key: 'area', label: AREA, formula: 'S = a²√3 / 2 + 3a·h', value: 2 * base + 3 * a * h },
      ];
    }
    case 'cylinder':
      return [
        { key: 'volume', label: VOLUME, formula: 'V = πr²h', value: Math.PI * r * r * h },
        { key: 'lateral', label: LATERAL, formula: 'S_xq = 2πrh', value: 2 * Math.PI * r * h },
        { key: 'area', label: AREA, formula: 'S = 2πr(r + h)', value: 2 * Math.PI * r * (r + h) },
      ];
    case 'cone': {
      const l = Math.sqrt(r * r + h * h);
      return [
        { key: 'volume', label: VOLUME, formula: 'V = ⅓·πr²h', value: (Math.PI * r * r * h) / 3 },
        { key: 'lateral', label: LATERAL, formula: 'S_xq = πr·√(r² + h²)', value: Math.PI * r * l },
        { key: 'area', label: AREA, formula: 'S = πr² + S_xq', value: Math.PI * r * (r + l) },
      ];
    }
    case 'sphere':
      return [
        { key: 'volume', label: VOLUME, formula: 'V = 4/3·πr³', value: (4 / 3) * Math.PI * r ** 3 },
        { key: 'area', label: AREA, formula: 'S = 4πr²', value: 4 * Math.PI * r * r },
      ];
  }
}

/** The centre of the solid's box and the radius of a sphere around it, to aim and fit the camera. */
export function bounds(s: Solid): { center: Vec3; radius: number } {
  const pts = Object.values(s.points);
  if (s.round) {
    const { r, h, type } = s.round;
    if (type === 'sphere') pts.push([-r, -r, -r], [r, r, r]);
    else pts.push([-r, -r, 0], [r, r, h]);
  }
  const lo = [0, 1, 2].map((i) => Math.min(...pts.map((p) => p[i]!)));
  const hi = [0, 1, 2].map((i) => Math.max(...pts.map((p) => p[i]!)));
  const center = v3((lo[0]! + hi[0]!) / 2, (lo[1]! + hi[1]!) / 2, (lo[2]! + hi[2]!) / 2);
  const radius = Math.max(...pts.map((p) => distance(p, center)));
  return { center, radius };
}
