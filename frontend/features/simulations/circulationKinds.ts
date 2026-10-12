import type { Bilingual } from './types';

// The four ways blood travels in animals (Biology 11, lesson 10, Hình 10.1 and 10.2), drawn as flat
// diagrams: a ring of segments for the blood to run along, the chambers of the heart, and labels.
// Coordinates are in a 640 × 460 box.

export type Point = readonly [number, number];
/** How much oxygen the blood carries: 0 is the blue of CO₂-rich blood, 1 the red of O₂-rich blood. */
export type Oxygen = number;
type Segment = { readonly points: readonly Point[]; readonly from: Oxygen; readonly to: Oxygen; readonly seconds: number };
export type Loop = { readonly segments: readonly Segment[]; readonly particles: number };
type Chamber = { readonly key: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly oxygen: Oxygen; readonly beat: 'atria' | 'ventricles'; readonly label?: Bilingual };
type Label = { readonly at: Point; readonly text: Bilingual; readonly anchor?: 'start' | 'middle' | 'end' };
type Cell = readonly [number, number];

export const TYPE_KEYS = ['open', 'single', 'double3', 'double4'] as const;
export type CirculationType = (typeof TYPE_KEYS)[number];

export type TypeDiagram = {
  readonly name: Bilingual;
  readonly animals: Bilingual;
  readonly heart: Bilingual;
  readonly vessels: Bilingual;
  readonly loops: Bilingual;
  readonly pressure: Bilingual;
  readonly route: Bilingual;
  readonly note: Bilingual;
  /** The blood's routes; each segment's `seconds` is how long it takes at 75 beats per minute. */
  readonly rings: readonly Loop[];
  readonly chambers: readonly Chamber[];
  readonly labels: readonly Label[];
  /** A rounded box standing for the body cavity (open system only). */
  readonly cavity?: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly cells?: readonly Cell[];
  /** Capillary beds, drawn as a thin zigzag under the moving blood. */
  readonly beds: readonly (readonly Point[])[];
};

/** A zigzag of `turns` bends from one point to another, as a capillary network. */
const zigzag = (from: Point, to: Point, turns: number, amplitude: number): Point[] => {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const points: Point[] = [from];
  for (let i = 1; i < turns * 2; i++) {
    const side = i % 2 === 1 ? 1 : -1;
    points.push([from[0] + (dx * i) / (turns * 2) + nx * amplitude * side, from[1] + (dy * i) / (turns * 2) + ny * amplitude * side]);
  }
  points.push(to);
  return points;
};

// ── Closed, double: the four-chamber heart (a mammal) ──
const lungs: Point[] = zigzag([200, 62], [440, 62], 10, 9);
const body: Point[] = zigzag([500, 398], [140, 398], 14, 9);
const doubleRing = (chambers: { readonly rightToLeft: number; readonly artery: Oxygen; readonly aorta: Oxygen; readonly ventricle: Oxygen }): Loop => ({
  particles: 16,
  segments: [
    { points: [[280, 158], [280, 225]], from: chambers.rightToLeft, to: chambers.ventricle, seconds: 0.8 },
    { points: [[280, 225], [306, 200], [320, 185], [320, 105], [200, 105], [200, 62]], from: chambers.ventricle, to: chambers.artery, seconds: 1.0 },
    { points: lungs, from: chambers.artery, to: 1, seconds: 2.4 },
    { points: [[440, 62], [440, 158], [360, 158]], from: 1, to: 1, seconds: 1.0 },
    { points: [[360, 158], [360, 225]], from: 1, to: chambers.ventricle, seconds: 0.8 },
    { points: [[360, 225], [500, 225], [500, 398]], from: chambers.ventricle, to: chambers.aorta, seconds: 1.2 },
    { points: body, from: chambers.aorta, to: 0, seconds: 3.0 },
    { points: [[140, 398], [70, 398], [70, 158], [280, 158]], from: 0, to: 0, seconds: 1.8 },
  ],
});

// ── Closed, single: a fish ──
const gills: Point[] = zigzag([230, 215], [330, 215], 6, 11);
const fishBody: Point[] = zigzag([450, 310], [200, 310], 12, 10);

// ── Open: a grasshopper ──
const cavityWander = (side: 'left' | 'right'): Point[] => {
  const mirror = (x: number): number => (side === 'left' ? x : 640 - x);
  return [[140, 150], [175, 205], [130, 255], [200, 315], [262, 262], [248, 205], [262, 150]].map(([x, y]) => [mirror(x!), y!] as Point);
};
const openLoop = (side: 'left' | 'right'): Loop => {
  const wander = cavityWander(side);
  const mirror = (x: number): number => (side === 'left' ? x : 640 - x);
  return {
    particles: 9,
    segments: [
      { points: [[mirror(210), 76], [mirror(140), 76], [mirror(140), 150]], from: 0.5, to: 0.5, seconds: 1.5 },
      { points: wander, from: 0.5, to: 0.5, seconds: 10 },
      { points: [wander[wander.length - 1]!, [mirror(262), 96], [mirror(262), 76], [mirror(210), 76]], from: 0.5, to: 0.5, seconds: 2.5 },
    ],
  };
};

export const DIAGRAMS: Record<CirculationType, TypeDiagram> = {
  open: {
    name: { vi: 'Hệ tuần hoàn hở', en: 'Open circulation' },
    animals: { vi: 'Châu chấu, tôm; một số thân mềm (ốc, trai)', en: 'Grasshopper, shrimp; some molluscs (snails, mussels)' },
    heart: { vi: 'Tim ống ở mặt lưng', en: 'A tube along the back' },
    vessels: { vi: 'Động mạch và ống góp, không có mao mạch', en: 'Arteries and collecting vessels, no capillaries' },
    loops: { vi: 'Máu tràn vào xoang cơ thể', en: 'Blood spills into the body cavity' },
    pressure: { vi: 'Áp lực thấp, máu chảy chậm', en: 'Low pressure, slow blood' },
    route: { vi: 'Tim → động mạch → xoang cơ thể (máu trộn với dịch mô, trao đổi chất trực tiếp với tế bào) → ống góp → tim.', en: 'Heart → arteries → body cavity (blood mixes with tissue fluid and exchanges directly with the cells) → collecting vessels → heart.' },
    note: { vi: 'Gọi là hở vì máu rời mạch và tràn vào xoang cơ thể, không phải vì thiếu mạch máu. Máu chảy chậm, tim thu hồi máu chậm.', en: 'It is called open because the blood leaves the vessels and floods the body cavity, not because vessels are missing. The blood is slow and returns to the heart slowly.' },
    rings: [openLoop('left'), openLoop('right')],
    chambers: [{ key: 'tube', x: 210, y: 60, width: 220, height: 32, oxygen: 0.5, beat: 'ventricles' }],
    cavity: { x: 90, y: 130, width: 460, height: 250 },
    cells: [[180, 175], [225, 235], [150, 225], [205, 290], [280, 300], [320, 215], [360, 300], [430, 290], [470, 225], [415, 175], [345, 160], [300, 240], [260, 340], [385, 345], [500, 330], [140, 330]],
    beds: [],
    labels: [
      { at: [320, 54], text: { vi: 'Tim (dạng ống)', en: 'Heart (a tube)' }, anchor: 'middle' },
      { at: [128, 112], text: { vi: 'Động mạch', en: 'Artery' }, anchor: 'end' },
      { at: [512, 112], text: { vi: 'Động mạch', en: 'Artery' }, anchor: 'start' },
      { at: [320, 124], text: { vi: 'Ống góp', en: 'Collecting vessels' }, anchor: 'middle' },
      { at: [320, 372], text: { vi: 'Xoang cơ thể: máu trộn dịch mô, tiếp xúc trực tiếp với tế bào', en: 'Body cavity: blood mixed with tissue fluid touches the cells directly' }, anchor: 'middle' },
    ],
  },
  single: {
    name: { vi: 'Hệ tuần hoàn kín, đơn', en: 'Closed, single circulation' },
    animals: { vi: 'Cá xương, cá sụn', en: 'Bony and cartilaginous fish' },
    heart: { vi: 'Tim 2 ngăn: 1 tâm nhĩ, 1 tâm thất', en: 'Two chambers: one atrium, one ventricle' },
    vessels: { vi: 'Động mạch, mao mạch, tĩnh mạch', en: 'Arteries, capillaries, veins' },
    loops: { vi: '1 vòng tuần hoàn', en: 'One circuit' },
    pressure: { vi: 'Áp lực trung bình; máu nghèo O₂ chỉ về tim một lần mỗi vòng', en: 'Medium pressure; the blood passes the heart once a circuit' },
    route: { vi: 'Tâm thất → động mạch mang → mao mạch mang (trao đổi khí, máu giàu O₂) → động mạch lưng → mao mạch các cơ quan (máu giàu CO₂) → tĩnh mạch → tâm nhĩ.', en: 'Ventricle → gill arteries → gill capillaries (gas exchange, O₂-rich blood) → dorsal aorta → capillaries of the organs (CO₂-rich blood) → veins → atrium.' },
    note: { vi: 'Máu chỉ đi qua tim một lần trong mỗi vòng. Sau khi qua mang, áp lực máu giảm nên máu tới các cơ quan chảy với áp lực trung bình.', en: 'Blood passes through the heart only once a circuit. After the gills the pressure has dropped, so blood reaches the organs at medium pressure.' },
    rings: [{
      particles: 14,
      segments: [
        { points: [[120, 150], [120, 215]], from: 0, to: 0, seconds: 0.8 },
        { points: [[120, 215], [150, 215], [230, 215]], from: 0, to: 0, seconds: 0.9 },
        { points: gills, from: 0, to: 1, seconds: 1.8 },
        { points: [[330, 215], [450, 215], [450, 310]], from: 1, to: 1, seconds: 1.5 },
        { points: fishBody, from: 1, to: 0, seconds: 3.2 },
        { points: [[200, 310], [60, 310], [60, 150], [120, 150]], from: 0, to: 0, seconds: 1.8 },
      ],
    }],
    chambers: [
      { key: 'atrium', x: 92, y: 126, width: 56, height: 48, oxygen: 0, beat: 'atria', label: { vi: 'Tâm nhĩ', en: 'Atrium' } },
      { key: 'ventricle', x: 92, y: 182, width: 56, height: 66, oxygen: 0, beat: 'ventricles', label: { vi: 'Tâm thất', en: 'Ventricle' } },
    ],
    beds: [gills, fishBody],
    labels: [
      { at: [280, 172], text: { vi: 'Mao mạch mang: trao đổi khí', en: 'Gill capillaries: gas exchange' }, anchor: 'middle' },
      { at: [390, 196], text: { vi: 'Động mạch lưng', en: 'Dorsal aorta' }, anchor: 'middle' },
      { at: [325, 342], text: { vi: 'Mao mạch các cơ quan', en: 'Capillaries of the organs' }, anchor: 'middle' },
      { at: [130, 342], text: { vi: 'Tĩnh mạch', en: 'Veins' }, anchor: 'middle' },
    ],
  },
  double3: {
    name: { vi: 'Hệ tuần hoàn kín, kép (tim 3 ngăn)', en: 'Closed, double circulation (three chambers)' },
    animals: { vi: 'Lưỡng cư, phần lớn bò sát', en: 'Amphibians, most reptiles' },
    heart: { vi: 'Tim 3 ngăn: 2 tâm nhĩ, 1 tâm thất', en: 'Three chambers: two atria, one ventricle' },
    vessels: { vi: 'Động mạch, mao mạch, tĩnh mạch', en: 'Arteries, capillaries, veins' },
    loops: { vi: '2 vòng: vòng tuần hoàn nhỏ và vòng tuần hoàn lớn', en: 'Two circuits: pulmonary and systemic' },
    pressure: { vi: 'Áp lực cao hơn hệ đơn; máu ở tâm thất bị pha một phần', en: 'Higher pressure than the single system; blood in the ventricle is partly mixed' },
    route: { vi: 'Vòng nhỏ: tâm thất → động mạch phổi → mao mạch phổi → tĩnh mạch phổi → tâm nhĩ trái. Vòng lớn: tâm thất → động mạch chủ → mao mạch cơ quan → tĩnh mạch chủ → tâm nhĩ phải.', en: 'Pulmonary: ventricle → pulmonary artery → lung capillaries → pulmonary veins → left atrium. Systemic: ventricle → aorta → capillaries of the organs → venae cavae → right atrium.' },
    note: { vi: 'Máu trở về tim hai lần trong mỗi vòng nên được tăng áp lần nữa. Tâm thất chỉ có một ngăn nên máu giàu O₂ và máu giàu CO₂ pha trộn một phần, máu đi nuôi cơ thể kém giàu O₂ hơn ở tim 4 ngăn.', en: 'Blood returns to the heart twice a circuit and is pressurised again. With one ventricle the O₂-rich and CO₂-rich blood partly mix, so the blood sent to the body carries less O₂ than from a four-chamber heart.' },
    rings: [doubleRing({ rightToLeft: 0, artery: 0.2, aorta: 0.65, ventricle: 0.4 })],
    chambers: [
      { key: 'ra', x: 250, y: 130, width: 60, height: 56, oxygen: 0, beat: 'atria', label: { vi: 'Nhĩ phải', en: 'Right atrium' } },
      { key: 'la', x: 330, y: 130, width: 60, height: 56, oxygen: 1, beat: 'atria', label: { vi: 'Nhĩ trái', en: 'Left atrium' } },
      { key: 'v', x: 250, y: 194, width: 140, height: 62, oxygen: 0.45, beat: 'ventricles', label: { vi: 'Tâm thất (máu pha)', en: 'Ventricle (mixed blood)' } },
    ],
    beds: [lungs, body],
    labels: [
      { at: [320, 36], text: { vi: 'Mao mạch phổi', en: 'Lung capillaries' }, anchor: 'middle' },
      { at: [320, 424], text: { vi: 'Mao mạch các cơ quan', en: 'Capillaries of the organs' }, anchor: 'middle' },
      { at: [160, 98], text: { vi: 'Vòng nhỏ', en: 'Pulmonary' }, anchor: 'middle' },
      { at: [540, 300], text: { vi: 'Vòng lớn', en: 'Systemic' }, anchor: 'start' },
    ],
  },
  double4: {
    name: { vi: 'Hệ tuần hoàn kín, kép (tim 4 ngăn)', en: 'Closed, double circulation (four chambers)' },
    animals: { vi: 'Chim và thú (kể cả người)', en: 'Birds and mammals (people included)' },
    heart: { vi: 'Tim 4 ngăn: 2 tâm nhĩ, 2 tâm thất', en: 'Four chambers: two atria, two ventricles' },
    vessels: { vi: 'Động mạch, mao mạch, tĩnh mạch', en: 'Arteries, capillaries, veins' },
    loops: { vi: '2 vòng: vòng tuần hoàn nhỏ và vòng tuần hoàn lớn', en: 'Two circuits: pulmonary and systemic' },
    pressure: { vi: 'Áp lực cao, máu chảy nhanh và đi xa', en: 'High pressure; fast blood that reaches far' },
    route: { vi: 'Vòng nhỏ: tâm thất phải → động mạch phổi → mao mạch phổi → tĩnh mạch phổi → tâm nhĩ trái. Vòng lớn: tâm thất trái → động mạch chủ → mao mạch cơ quan → tĩnh mạch chủ → tâm nhĩ phải.', en: 'Pulmonary: right ventricle → pulmonary artery → lung capillaries → pulmonary veins → left atrium. Systemic: left ventricle → aorta → capillaries of the organs → venae cavae → right atrium.' },
    note: { vi: 'Vách ngăn hoàn toàn giữa hai nửa tim nên máu giàu O₂ không bị pha với máu giàu CO₂. Tim bơm máu hai lần mỗi vòng nên máu tới cơ quan chảy với áp lực lớn, đi xa; chênh lệch huyết áp giữa hai đầu đoạn mạch giúp máu chảy.', en: 'A complete wall splits the two halves of the heart, so O₂-rich blood never mixes with CO₂-rich blood. The heart pumps twice a circuit, so blood reaches the organs under high pressure and travels far; the pressure difference between the ends of a vessel keeps it moving.' },
    rings: [doubleRing({ rightToLeft: 0, artery: 0, aorta: 1, ventricle: 0 })],
    chambers: [
      { key: 'ra', x: 250, y: 130, width: 60, height: 56, oxygen: 0, beat: 'atria', label: { vi: 'Nhĩ phải', en: 'Right atrium' } },
      { key: 'la', x: 330, y: 130, width: 60, height: 56, oxygen: 1, beat: 'atria', label: { vi: 'Nhĩ trái', en: 'Left atrium' } },
      { key: 'rv', x: 250, y: 194, width: 60, height: 62, oxygen: 0, beat: 'ventricles', label: { vi: 'Thất phải', en: 'Right ventricle' } },
      { key: 'lv', x: 330, y: 194, width: 60, height: 62, oxygen: 1, beat: 'ventricles', label: { vi: 'Thất trái', en: 'Left ventricle' } },
    ],
    beds: [lungs, body],
    labels: [
      { at: [320, 36], text: { vi: 'Mao mạch phổi', en: 'Lung capillaries' }, anchor: 'middle' },
      { at: [320, 424], text: { vi: 'Mao mạch các cơ quan', en: 'Capillaries of the organs' }, anchor: 'middle' },
      { at: [160, 98], text: { vi: 'Vòng nhỏ', en: 'Pulmonary' }, anchor: 'middle' },
      { at: [540, 300], text: { vi: 'Vòng lớn', en: 'Systemic' }, anchor: 'start' },
    ],
  },
};

export const TYPE_NAMES: Record<CirculationType, Bilingual> = {
  open: { vi: 'Hở', en: 'Open' },
  single: { vi: 'Kín, đơn', en: 'Closed, single' },
  double3: { vi: 'Kép, tim 3 ngăn', en: 'Double, 3 chambers' },
  double4: { vi: 'Kép, tim 4 ngăn', en: 'Double, 4 chambers' },
};

// ── Geometry used to run blood along the rings ──
export type Run = { readonly segments: readonly { readonly points: readonly Point[]; readonly lengths: readonly number[]; readonly total: number; readonly from: Oxygen; readonly to: Oxygen; readonly start: number; readonly end: number }[]; readonly duration: number };

export function runOf(loop: Loop): Run {
  let clock = 0;
  const segments = loop.segments.map((segment) => {
    const lengths = segment.points.slice(1).map((point, i) => Math.hypot(point[0] - segment.points[i]![0], point[1] - segment.points[i]![1]));
    const start = clock;
    clock += segment.seconds;
    return { points: segment.points, lengths, total: lengths.reduce((a, b) => a + b, 0), from: segment.from, to: segment.to, start, end: clock };
  });
  return { segments, duration: clock };
}

/** Where a particle is, and how oxygen-rich, a fraction `fraction` (0–1) of the way round the loop. */
export function placeOn(run: Run, fraction: number): { readonly x: number; readonly y: number; readonly oxygen: Oxygen } {
  const moment = (((fraction % 1) + 1) % 1) * run.duration;
  const segment = run.segments.find((s) => moment >= s.start && moment < s.end) ?? run.segments[run.segments.length - 1]!;
  const along = (moment - segment.start) / (segment.end - segment.start);
  let left = along * segment.total;
  let index = 0;
  while (index < segment.lengths.length - 1 && left > segment.lengths[index]!) { left -= segment.lengths[index]!; index++; }
  const a = segment.points[index]!;
  const b = segment.points[index + 1]!;
  const mix = segment.lengths[index] ? Math.min(1, left / segment.lengths[index]!) : 0;
  return { x: a[0] + (b[0] - a[0]) * mix, y: a[1] + (b[1] - a[1]) * mix, oxygen: segment.from + (segment.to - segment.from) * along };
}
