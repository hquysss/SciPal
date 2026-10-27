// Logic gates, the half adder and binary numbers, as in Tin học 10 (KNTT Chủ đề 2).

import type { LOGIC_GATES } from '@scipal/types';

export type Gate = (typeof LOGIC_GATES)[number];
export type Bit = 0 | 1;
type Bilingual = { en: string; vi: string };

export const GATES: Record<Gate, { inputs: 1 | 2; name: Bilingual; expression: string; rule: Bilingual; fn: (a: Bit, b: Bit) => Bit }> = {
  and: {
    inputs: 2,
    name: { en: 'AND', vi: 'AND (và)' },
    expression: 'A AND B',
    rule: { en: '1 only when both inputs are 1.', vi: 'Bằng 1 chỉ khi cả hai đầu vào đều bằng 1.' },
    fn: (a, b) => (a & b) as Bit,
  },
  or: {
    inputs: 2,
    name: { en: 'OR', vi: 'OR (hoặc)' },
    expression: 'A OR B',
    rule: { en: '1 when at least one input is 1.', vi: 'Bằng 1 khi có ít nhất một đầu vào bằng 1.' },
    fn: (a, b) => (a | b) as Bit,
  },
  not: {
    inputs: 1,
    name: { en: 'NOT', vi: 'NOT (phủ định)' },
    expression: 'NOT A',
    rule: { en: 'Turns 1 into 0 and 0 into 1.', vi: 'Đổi 1 thành 0 và 0 thành 1.' },
    fn: (a) => (a ? 0 : 1),
  },
  xor: {
    inputs: 2,
    name: { en: 'XOR', vi: 'XOR (hoặc loại trừ)' },
    expression: 'A XOR B',
    rule: { en: '1 when the inputs differ.', vi: 'Bằng 1 khi hai đầu vào khác nhau.' },
    fn: (a, b) => (a ^ b) as Bit,
  },
  nand: {
    inputs: 2,
    name: { en: 'NAND', vi: 'NAND (không và)' },
    expression: 'NOT (A AND B)',
    rule: { en: 'The opposite of AND: 0 only when both inputs are 1.', vi: 'Ngược với AND: bằng 0 chỉ khi cả hai đầu vào đều bằng 1.' },
    fn: (a, b) => ((a & b) ? 0 : 1),
  },
  nor: {
    inputs: 2,
    name: { en: 'NOR', vi: 'NOR (không hoặc)' },
    expression: 'NOT (A OR B)',
    rule: { en: 'The opposite of OR: 1 only when both inputs are 0.', vi: 'Ngược với OR: bằng 1 chỉ khi cả hai đầu vào đều bằng 0.' },
    fn: (a, b) => ((a | b) ? 0 : 1),
  },
};

export const evalGate = (gate: Gate, a: Bit, b: Bit = 0): Bit => GATES[gate].fn(a, b);

export function truthTable(gate: Gate): Array<{ a: Bit; b?: Bit; out: Bit }> {
  if (GATES[gate].inputs === 1) return ([0, 1] as const).map((a) => ({ a, out: evalGate(gate, a) }));
  return ([[0, 0], [0, 1], [1, 0], [1, 1]] as const).map(([a, b]) => ({ a, b, out: evalGate(gate, a, b) }));
}

/** Sum S = A XOR B, carry C = A AND B. */
export const halfAdder = (a: Bit, b: Bit) => ({ s: (a ^ b) as Bit, c: (a & b) as Bit });

/** The bits of `value` (modulo 2^bits), most significant first. */
export const toBits = (value: number, bits: number): Bit[] =>
  Array.from({ length: bits }, (_, i) => ((((value % 2 ** bits) + 2 ** bits) % 2 ** bits) >> (bits - 1 - i)) & 1) as Bit[];

export const fromBits = (bits: readonly Bit[]): number => bits.reduce<number>((v, b) => v * 2 + b, 0);

/** n ÷ 2 = q remainder r, until the quotient is 0; the remainders read from the last are the bits. */
export function divisionSteps(n: number): Array<{ n: number; q: number; r: Bit }> {
  const steps: Array<{ n: number; q: number; r: Bit }> = [];
  for (let x = Math.max(0, Math.floor(n)); x > 0; x = Math.floor(x / 2)) steps.push({ n: x, q: Math.floor(x / 2), r: (x % 2) as Bit });
  return steps;
}

/** "8 + 4 + 1 = 13": the place values of the bits that are 1. */
export function placeValueSentence(value: number, bits: number): string {
  const terms = toBits(value, bits).flatMap((b, i) => (b ? [2 ** (bits - 1 - i)] : []));
  return `${terms.length ? terms.join(' + ') : '0'} = ${fromBits(toBits(value, bits))}`;
}
