import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { LevelScope } from '../theme';

describe('LevelScope', () => {
  it('re-scopes theme tokens for its subtree without painting a background', () => {
    const output = LevelScope({ level: 'primary', className: 'lesson', children: 'grade 5 lesson' });
    if (!isValidElement<{ 'data-level': string; className?: string; children: ReactNode; style?: unknown }>(output)) {
      throw new Error('LevelScope did not return an element');
    }
    expect(output.type).toBe('div');
    expect(output.props['data-level']).toBe('primary');
    expect(output.props.className).toBe('lesson');
    expect(output.props.children).toBe('grade 5 lesson');
    expect(output.props.style).toBeUndefined();
  });
});
