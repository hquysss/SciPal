'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { cardiacState } from './engines/circulation';
import { DIAGRAMS, placeOn, runOf, type CirculationType, type Oxygen, type Point } from './circulationKinds';
import { pick, type Lang } from './types';

// Flat diagrams of the four kinds of circulation (textbook figures 10.1 and 10.2). The blood runs
// along each route at a speed that follows the heart rate; the chambers beat with the cardiac cycle.

const colour = (oxygen: Oxygen) => `color-mix(in srgb, var(--circ-artery) ${Math.round(oxygen * 100)}%, var(--circ-vein))`;
const trace = (points: readonly Point[]) => points.map((p) => p.join(',')).join(' ');
const RADIUS = 5.5;

export function CirculationTypes({ lang, type, heartRate, time, running, stamp }: { readonly lang: Lang; readonly type: CirculationType; readonly heartRate: number; readonly time: RefObject<number>; readonly running: boolean; readonly stamp: number }) {
  const t = pick(lang);
  const diagram = DIAGRAMS[type];
  const runs = useMemo(() => diagram.rings.map(runOf), [diagram]);
  const particles = useRef<(SVGCircleElement | null)[]>([]);
  const chambers = useRef<(SVGGElement | null)[]>([]);
  useEffect(() => {
    const draw = () => {
      const now = time.current;
      let index = 0;
      diagram.rings.forEach((ring, loop) => {
        const run = runs[loop]!;
        for (let i = 0; i < ring.particles; i++) {
          const spot = placeOn(run, (now * heartRate) / 75 / run.duration + i / ring.particles);
          const circle = particles.current[index++];
          if (circle) { circle.setAttribute('cx', spot.x.toFixed(1)); circle.setAttribute('cy', spot.y.toFixed(1)); circle.style.fill = colour(spot.oxygen); }
        }
      });
      const state = cardiacState(now, heartRate);
      diagram.chambers.forEach((chamber, i) => {
        const group = chambers.current[i];
        if (group) group.style.transform = `scale(${1 - 0.12 * state[chamber.beat]})`;
      });
    };
    draw();
    if (!running) return;
    let frame = requestAnimationFrame(function tick() { draw(); frame = requestAnimationFrame(tick); });
    return () => cancelAnimationFrame(frame);
  }, [diagram, runs, heartRate, time, running, stamp]);

  let index = 0;
  return <svg viewBox="0 0 640 460" className="h-full w-full" role="img" aria-label={t(diagram.name)} preserveAspectRatio="xMidYMid meet" fontFamily="inherit">
    {diagram.cavity && <rect {...diagram.cavity} rx={28} fill="var(--circ-white)" opacity={0.07} stroke="var(--circ-white)" strokeOpacity={0.35} strokeDasharray="6 5" />}
    {diagram.cells?.map(([x, y]) => <circle key={`${x},${y}`} cx={x} cy={y} r={7} fill="var(--circ-wall)" opacity={0.3} />)}
    {diagram.beds.map((bed, i) => <polyline key={i} points={trace(bed)} fill="none" stroke="var(--circ-white)" strokeOpacity={0.3} strokeWidth={2} strokeLinejoin="round" />)}
    {diagram.rings.map((ring, loop) => ring.segments.map((segment, s) => <polyline key={`${loop}-${s}`} points={trace(segment.points)} fill="none" stroke={colour((segment.from + segment.to) / 2)} strokeOpacity={0.3} strokeWidth={segment.points.length > 6 ? 2 : 7} strokeLinejoin="round" strokeLinecap="round" />))}
    {diagram.chambers.map((chamber, i) => <g key={chamber.key} ref={(el) => { chambers.current[i] = el; }} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
      <rect x={chamber.x} y={chamber.y} width={chamber.width} height={chamber.height} rx={10} fill={colour(chamber.oxygen)} fillOpacity={0.55} stroke="var(--circ-white)" strokeOpacity={0.6} />
      {chamber.label && <text x={chamber.x + chamber.width / 2} y={chamber.beat === 'atria' ? chamber.y - 7 : chamber.y + chamber.height + 15} fontSize={11} textAnchor="middle" fill="var(--circ-white)" fontWeight={600}>{t(chamber.label)}</text>}
    </g>)}
    {diagram.rings.map((ring, loop) => Array.from({ length: ring.particles }, (_, i) => { const slot = index++; return <circle key={`${loop}-${i}`} ref={(el) => { particles.current[slot] = el; }} r={RADIUS} cx={-20} cy={-20} stroke="var(--circ-background)" strokeWidth={1} />; }))}
    {diagram.labels.map((label) => <text key={`${label.text.en}-${label.at[0]}`} x={label.at[0]} y={label.at[1]} fontSize={12} textAnchor={label.anchor ?? 'middle'} fill="var(--circ-white)">{t(label.text)}</text>)}
  </svg>;
}
