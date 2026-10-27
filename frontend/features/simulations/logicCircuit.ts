// Where the parts of each circuit sit on the board (x to the right, z towards the viewer), and
// which signal every wire carries. The scene only draws this; the logic lives in engines/logic.

import { evalGate, halfAdder, type Bit, type Gate } from './engines/logic';

export type Point = readonly [number, number];
export type Circuit = {
  switches: Array<{ id: string; label: string; x: number; z: number; on: Bit }>;
  gates: Array<{ gate: Gate; x: number; z: number }>;
  lamps: Array<{ id: string; label: string; x: number; z: number; on: Bit }>;
  /** `lift` arches a wire over another one it crosses. */
  wires: Array<{ from: Point; to: Point; on: Bit; lift?: number }>;
  dots: Array<{ x: number; z: number; on: Bit }>;
  /** Place values and other words pinned over the board. */
  labels: Array<{ key: string; text: string; x: number; z: number }>;
  width: number;
  depth: number;
};

/** The body of a gate, in its own 2D outline coordinates (x forward, y up the page). */
export const BUBBLE: Partial<Record<Gate, number>> = { not: 0.67, nand: 0.82, nor: 0.97 };
const OUT_X: Record<Gate, number> = { and: 0.7, or: 0.85, xor: 0.95, not: 0.8, nand: 0.95, nor: 1.1 };
const IN_X: Record<Gate, number> = { and: -0.8, or: -0.72, xor: -0.62, not: -0.7, nand: -0.8, nor: -0.72 };

/** The input and output ends of a gate placed at (x, z); outline y maps to −z on the board. */
export function gatePorts(gate: Gate, x: number, z: number): { inputs: Point[]; output: Point } {
  const ins = gate === 'not' ? [0] : [0.38, -0.38];
  return { inputs: ins.map((y) => [x + IN_X[gate], z - y] as const), output: [x + OUT_X[gate], z] };
}

const SWITCH_OUT = 0.45; // a switch's terminal, to the right of its centre
const LAMP_IN = 0.4; // a lamp's terminal, to the left of its centre

export function gateCircuit(gate: Gate, a: Bit, b: Bit): Circuit {
  const one = gate === 'not';
  const ports = gatePorts(gate, 0, 0);
  const out = evalGate(gate, a, b);
  const switches = one ? [{ id: 'A', label: 'A', x: -3.2, z: 0, on: a }] : [{ id: 'A', label: 'A', x: -3.2, z: -0.9, on: a }, { id: 'B', label: 'B', x: -3.2, z: 0.9, on: b }];
  return {
    switches,
    gates: [{ gate, x: 0, z: 0 }],
    lamps: [{ id: 'Q', label: 'Q', x: 3.2, z: 0, on: out }],
    wires: [
      ...switches.map((s, i) => ({ from: [s.x + SWITCH_OUT, s.z] as const, to: ports.inputs[i]!, on: s.on })),
      { from: ports.output, to: [3.2 - LAMP_IN, 0] as const, on: out },
    ],
    dots: [],
    labels: [],
    width: 8.6,
    depth: 4.4,
  };
}

export function halfAdderCircuit(a: Bit, b: Bit): Circuit {
  const { s, c } = halfAdder(a, b);
  const xor = gatePorts('xor', 0.4, -1.3);
  const and = gatePorts('and', 0.4, 1.3);
  const A = { x: -3.6, z: -1.3 };
  const B = { x: -3.6, z: 1.3 };
  // A and B each split at a junction and feed both gates.
  const ja = [-2.3, -1.3 + 0.38] as const;
  const jb = [-1.7, 1.3 - 0.38] as const;
  return {
    switches: [{ id: 'A', label: 'A', ...A, on: a }, { id: 'B', label: 'B', ...B, on: b }],
    gates: [{ gate: 'xor', x: 0.4, z: -1.3 }, { gate: 'and', x: 0.4, z: 1.3 }],
    lamps: [{ id: 'S', label: 'S', x: 3.5, z: -1.3, on: s }, { id: 'C', label: 'C', x: 3.5, z: 1.3, on: c }],
    wires: [
      { from: [A.x + SWITCH_OUT, A.z], to: ja, on: a },
      { from: ja, to: xor.inputs[0]!, on: a },
      { from: ja, to: and.inputs[0]!, on: a },
      { from: [B.x + SWITCH_OUT, B.z], to: jb, on: b },
      { from: jb, to: xor.inputs[1]!, on: b, lift: 0.45 },
      { from: jb, to: and.inputs[1]!, on: b },
      { from: xor.output, to: [3.5 - LAMP_IN, -1.3], on: s },
      { from: and.output, to: [3.5 - LAMP_IN, 1.3], on: c },
    ],
    dots: [{ x: ja[0], z: ja[1], on: a }, { x: jb[0], z: jb[1], on: b }],
    labels: [],
    width: 9.4,
    depth: 5.2,
  };
}

/** A row of bits: each switch drives the lamp above it, with the place value written beyond. */
export function binaryCircuit(bits: readonly Bit[]): Circuit {
  const n = bits.length;
  const step = 1.05;
  const x = (i: number) => (i - (n - 1) / 2) * step;
  return {
    switches: bits.map((on, i) => ({ id: `b${n - 1 - i}`, label: '', x: x(i), z: 1.1, on })),
    gates: [],
    lamps: bits.map((on, i) => ({ id: `l${n - 1 - i}`, label: '', x: x(i), z: -0.7, on })),
    wires: bits.map((on, i) => ({ from: [x(i), 1.1 - 0.45] as const, to: [x(i), -0.7 + 0.38] as const, on })),
    dots: [],
    labels: bits.map((_, i) => ({ key: `p${i}`, text: String(2 ** (n - 1 - i)), x: x(i), z: -1.6 })),
    width: n * step + 1.4,
    depth: 4.4,
  };
}
