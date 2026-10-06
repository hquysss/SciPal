import { describe, expect, it } from 'vitest';
import { angleFromVector, exactTrig, normalizeDegrees, quadrant, radianLabel, snapDegrees, stepAngle, trigValue } from './unitCircle';

describe('normalizeDegrees', () => {
  it.each([
    [0, 0],
    [360, 0],
    [390, 30],
    [-30, 330],
    [-720, 0],
  ])('%d° → %d°', (input, out) => expect(normalizeDegrees(input)).toBe(out));
});

describe('snapDegrees', () => {
  it('settles on the nearest multiple of the step, wrapping at 360°', () => {
    expect(snapDegrees(37, 15)).toBe(30);
    expect(snapDegrees(38, 15)).toBe(45);
    expect(snapDegrees(359, 15)).toBe(0);
    expect(snapDegrees(44.6, 1)).toBe(45);
  });
});

describe('stepAngle', () => {
  it('moves by whole snap steps from a snapped angle, and lands on the grid from an off-grid one', () => {
    expect(stepAngle(30, 1, 15)).toBe(45);
    expect(stepAngle(0, -1, 15)).toBe(345);
    expect(stepAngle(37, 1, 15)).toBe(45);
    expect(stepAngle(37, -1, 15)).toBe(30);
  });
});

describe('angleFromVector', () => {
  it('measures counter-clockwise from the positive x-axis, y pointing up', () => {
    expect(angleFromVector(1, 0)).toBe(0);
    expect(angleFromVector(0, 1)).toBe(90);
    expect(angleFromVector(-1, 0)).toBe(180);
    expect(angleFromVector(0, -1)).toBe(270);
    expect(angleFromVector(1, 1)).toBeCloseTo(45);
  });
});

describe('quadrant', () => {
  it('names the quadrant, or 0 on an axis', () => {
    expect(quadrant(30)).toBe(1);
    expect(quadrant(120)).toBe(2);
    expect(quadrant(200)).toBe(3);
    expect(quadrant(300)).toBe(4);
    expect([0, 90, 180, 270].map(quadrant)).toEqual([0, 0, 0, 0]);
  });
});

describe('trigValue', () => {
  it('cleans floating noise so 180° has sin exactly 0', () => {
    expect(trigValue(180, 'sin')).toBe(0);
    expect(trigValue(90, 'cos')).toBe(0);
    expect(trigValue(60, 'cos')).toBeCloseTo(0.5);
  });

  it('is undefined where the function is: tan at 90° and 270°, cot at 0° and 180°', () => {
    expect(trigValue(90, 'tan')).toBeNull();
    expect(trigValue(270, 'tan')).toBeNull();
    expect(trigValue(0, 'cot')).toBeNull();
    expect(trigValue(180, 'cot')).toBeNull();
    expect(trigValue(45, 'tan')).toBeCloseTo(1);
  });
});

describe('exactTrig', () => {
  it.each([
    [30, 'sin', '1/2'],
    [150, 'cos', '−√3/2'],
    [225, 'sin', '−√2/2'],
    [60, 'tan', '√3'],
    [330, 'tan', '−√3/3'],
    [90, 'sin', '1'],
    [180, 'sin', '0'],
    [120, 'cot', '−√3/3'],
  ] as const)('%d° %s = %s', (deg, name, out) => expect(exactTrig(deg, name)).toBe(out));

  it('has no exact form off the special angles, or where the value is undefined', () => {
    expect(exactTrig(20, 'sin')).toBeNull();
    expect(exactTrig(15, 'sin')).toBeNull();
    expect(exactTrig(90, 'tan')).toBeNull();
  });
});

describe('radianLabel', () => {
  it.each([
    [0, '0'],
    [30, 'π/6'],
    [90, 'π/2'],
    [150, '5π/6'],
    [180, 'π'],
    [225, '5π/4'],
    [270, '3π/2'],
  ])('%d° = %s', (deg, out) => expect(radianLabel(deg)).toBe(out));

  it('falls back to null off the 15° grid', () => {
    expect(radianLabel(20)).toBeNull();
  });
});
