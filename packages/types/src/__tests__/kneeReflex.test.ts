import { describe, expect, it } from 'vitest';
import { BlockSchema } from '../block';
import { simulationConfig, validateSimulationBlock } from '../simulations';

describe('knee-reflex lesson blocks', () => {
  it('accepts an offline bilingual block with defaults', () => {
    const result = BlockSchema.safeParse({ type: 'interactive', kind: 'knee-reflex', heading: { vi: 'Phản xạ đầu gối', en: 'Knee-jerk reflex' }, offline: true, config: {} });
    expect(result.success).toBe(true);
    if (result.success && result.data.type === 'interactive') expect(validateSimulationBlock(result.data).ok).toBe(true);
  });
  it('rejects invalid playback speeds and unknown scene choices', () => {
    expect(simulationConfig('knee-reflex', { speed: 0 })).toBeNull();
    expect(simulationConfig('knee-reflex', { speed: 3 })).toBeNull();
    expect(simulationConfig('knee-reflex', { view: 'wrong' })).toBeNull();
    expect(simulationConfig('knee-reflex', {})).toEqual({ speed: 1, view: 'body', labels: true });
  });
});
