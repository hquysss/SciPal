import { HISTORY_MAP_REGIONS, type HistoryMapRegion, type SimulationConfigByKind } from '@scipal/types';

// Geometry shared by the 3D and flat history maps: an equirectangular projection around the
// region's centre (x east, y north, in degrees of latitude, longitude scaled by cos of the middle
// latitude so distances stay fair), the frame each step zooms to, and terrain height lookup.

export type HistoryMap = SimulationConfigByKind['history-map'];
export type LonLat = readonly [number, number];
export type Bounds = { west: number; south: number; east: number; north: number };

export const assetBase = (region: HistoryMapRegion) => `/models/history/${region}`;

export function projection(region: HistoryMapRegion) {
  const b = HISTORY_MAP_REGIONS[region];
  const k = Math.cos((((b.north + b.south) / 2) * Math.PI) / 180);
  const cx = (b.west + b.east) / 2;
  const cy = (b.south + b.north) / 2;
  return {
    bounds: b as Bounds,
    width: (b.east - b.west) * k,
    height: b.north - b.south,
    /** Plane coordinates, y north. */
    toPlane: ([lon, lat]: LonLat): [number, number] => [(lon - cx) * k, lat - cy],
    /** Texture coordinates: u east from the west edge, v south from the north edge, both 0–1. */
    toUv: ([lon, lat]: LonLat): [number, number] => [(lon - b.west) / (b.east - b.west), (b.north - lat) / (b.north - b.south)],
  };
}

const MIN_SPAN = 2.5;

/** The box a step zooms to: what it adds (areas, marches, new places), padded; an empty step keeps the one before. */
export function stepFrame(config: HistoryMap, index: number): Bounds {
  for (let i = Math.min(index, config.steps.length - 1); i >= 0; i -= 1) {
    const step = config.steps[i]!;
    const points: LonLat[] = [
      ...step.areas.flatMap((a) => a.points),
      ...step.routes.flatMap((r) => r.points),
      ...config.places.filter((p) => p.from === i && p.type !== 'area').map((p) => [p.lon, p.lat] as const),
    ];
    if (points.length === 0) continue;
    const lons = points.map((p) => p[0]);
    const lats = points.map((p) => p[1]);
    const cx = (Math.min(...lons) + Math.max(...lons)) / 2;
    const cy = (Math.min(...lats) + Math.max(...lats)) / 2;
    const half = (span: number) => Math.max(span * 1.3, MIN_SPAN) / 2;
    const hx = half(Math.max(...lons) - Math.min(...lons));
    const hy = half(Math.max(...lats) - Math.min(...lats));
    return { west: cx - hx, east: cx + hx, south: cy - hy, north: cy + hy };
  }
  return HISTORY_MAP_REGIONS[config.region];
}

/** A march split into pieces of at most `step` degrees, so it can follow the ground. */
export function densify(points: readonly LonLat[], step = 0.04): LonLat[] {
  const out: LonLat[] = [points[0]!];
  for (let i = 1; i < points.length; i += 1) {
    const [a, b] = [points[i - 1]!, points[i]!];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let j = 1; j <= n; j += 1) out.push([a[0] + ((b[0] - a[0]) * j) / n, a[1] + ((b[1] - a[1]) * j) / n]);
  }
  return out;
}

/** Metres at (u, v), bilinear over a row-major grid whose row 0 is the north edge. */
export function heightAt(heights: ArrayLike<number>, width: number, rows: number, u: number, v: number): number {
  const x = Math.min(Math.max(u * width - 0.5, 0), width - 1);
  const y = Math.min(Math.max(v * rows - 0.5, 0), rows - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, rows - 1);
  const fx = x - x0;
  const fy = y - y0;
  const at = (xx: number, yy: number) => heights[yy * width + xx] ?? 0;
  return (at(x0, y0) * (1 - fx) + at(x1, y0) * fx) * (1 - fy) + (at(x0, y1) * (1 - fx) + at(x1, y1) * fx) * fy;
}

/** Places shown at a step. */
export const placesAt = (config: HistoryMap, index: number) => config.places.filter((p) => p.from <= index);

/**
 * Whether a place is labelled at a step. A battle from an earlier step keeps only its mark (its note still
 * opens), unless a march of this step ends there, so maps of separate wars do not pile up names.
 */
export function namedAt(config: HistoryMap, place: HistoryMap['places'][number], index: number): boolean {
  if (place.type !== 'battle' || place.from === index) return true;
  return (config.steps[index]?.routes ?? []).some((r) => {
    const [lon, lat] = r.points[r.points.length - 1]!;
    return Math.abs(lon - place.lon) < 0.05 && Math.abs(lat - place.lat) < 0.05;
  });
}

// The slider runs continuously: between the marks of step s − 1 and s (`frac` 0 → 1) step s happens.
// Its marches are drawn first, one after another; its areas spread as the marches arrive; a new place
// appears when a march passes it.
const MARCH_SHARE = 0.75;
const AREA_START = 0.35;

/** How far through a step the slider is: 0 at the mark before, 1 at its own mark. Step 0 is always whole. */
export const stepFraction = (pos: number, step: number) => (step === 0 ? 1 : Math.min(Math.max(pos - (step - 1), 0), 1));

/** Marches drawn so far, in routes: 1.5 = the first done and the second half way. */
export const marchProgress = (frac: number, routes: number) => (routes ? Math.min(frac / MARCH_SHARE, 1) * routes : 0);

/** How far an area of the step has spread, 0–1. */
export const areaGrowth = (frac: number, hasRoutes: boolean) =>
  hasRoutes ? Math.min(Math.max((frac - AREA_START) / (1 - AREA_START), 0), 1) : Math.min(Math.max(frac, 0), 1);

const centre = (points: readonly LonLat[]): LonLat => [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length];
const gap = (a: LonLat, b: LonLat) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Where each area of a step spreads from: the end of the march that arrives nearest it, else its own centre. */
export function areaOrigins(config: HistoryMap, step: number): LonLat[] {
  const s = config.steps[step];
  if (!s) return [];
  const ends = s.routes.map((r) => r.points[r.points.length - 1]!);
  return s.areas.map((a) => {
    const c = centre(a.points);
    return ends.reduce<LonLat>((best, e) => (gap(e, c) < gap(best, c) ? e : best), ends[0] ?? c);
  });
}

/** When (as `frac`) each place first shown at this step appears: as a march passes within 0.4°, else half way. */
export function placeTimes(config: HistoryMap, step: number): Map<number, number> {
  const routes = config.steps[step]?.routes ?? [];
  const out = new Map<number, number>();
  config.places.forEach((p, i) => {
    if (p.from !== step) return;
    if (step === 0) return out.set(i, 0);
    let at = 0.5;
    let best = 0.4;
    routes.forEach((r, k) => {
      r.points.forEach((q, j) => {
        const d = gap(q, [p.lon, p.lat]);
        if (d <= best) {
          best = d;
          at = (MARCH_SHARE * (k + j / Math.max(r.points.length - 1, 1))) / routes.length;
        }
      });
    });
    out.set(i, at);
  });
  return out;
}

/** The years in a period, e.g. "1426–1427" → [1426, 1427]; none when it holds no year. */
export const yearsOf = (period: string) => (period.match(/\d{3,4}/g) ?? []).map(Number);

/** How long (as `frac`) a victory flares after a march reaches it. */
const BURST = 0.12;
/** Whether a place reached at `at` is flaring at `frac`: just after the slider passes it, never at the start. */
export const bursting = (frac: number, at: number) => at > 0 && frac >= at && frac - at < BURST;

/** The direction from a to b, in radians clockwise from north (east = π/2), on a map with lon scaled by cos(lat). */
const bearing = (a: LonLat, b: LonLat) => {
  const k = Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180);
  return Math.atan2((b[0] - a[0]) * k, b[1] - a[1]);
};

/**
 * Where a march is heading at `done` (0–1) of the way along it: from a little behind the head to
 * the head, so a camera turning with it follows the march's course, not every bend.
 */
export function marchHeading(points: readonly LonLat[], done: number): number {
  const at = (f: number): LonLat => {
    const x = Math.min(Math.max(f, 0), 1) * (points.length - 1);
    const i = Math.min(Math.floor(x), points.length - 2);
    const [a, b] = [points[i]!, points[i + 1]!];
    return [a[0] + (b[0] - a[0]) * (x - i), a[1] + (b[1] - a[1]) * (x - i)];
  };
  return bearing(at(done - 0.25), at(Math.max(done, 0.25)));
}

/** The general direction of a stage's marches: from where they start on average to where they end. */
export function stageHeading(config: HistoryMap, step: number): number | null {
  const routes = config.steps[step]?.routes ?? [];
  if (routes.length === 0) return null;
  return bearing(centre(routes.map((r) => r.points[0]!)), centre(routes.map((r) => r.points[r.points.length - 1]!)));
}
