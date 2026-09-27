import { evaluateGraph, parseGraphExpression, type SimulationConfigByKind } from '@scipal/types';

type GraphConfig = SimulationConfigByKind['function-graph'];
export type Point = [number, number];

/**
 * The curve as line segments inside the window: a new segment starts where f is undefined or
 * leaves the visible range, so asymptotes are not joined across. Sampling is capped by config.
 */
export function sampleGraph(config: GraphConfig, parameters: Readonly<Record<string, number>>): Point[][] {
  const parsed = parseGraphExpression(config.expression, config.parameters.map((p) => p.name));
  if (!parsed.ok) return [];
  const samples = Math.min(Math.max(config.samples, 2), 600);
  const span = config.yMax - config.yMin;
  const segments: Point[][] = [];
  let current: Point[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const x = config.xMin + ((config.xMax - config.xMin) * i) / samples;
    const y = evaluateGraph(parsed.ast, x, parameters);
    // A point far off-screen breaks the line (1/x near 0), a point just off-screen keeps it.
    if (y === null || y < config.yMin - span || y > config.yMax + span) {
      if (current.length > 1) segments.push(current);
      current = [];
      continue;
    }
    current.push([Number(x.toFixed(10)), y]);
  }
  if (current.length > 1) segments.push(current);
  return segments;
}
