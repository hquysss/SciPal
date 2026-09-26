import { isValidElement, type CSSProperties, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { SubjectProvider } from '../SubjectProvider';

describe('SubjectProvider data accent', () => {
  it('scopes a catalog accent to the subject wrapper', () => {
    const output = SubjectProvider({
      slug: 'informatics',
      accentColor: '#245398',
      children: 'subject content',
    });

    if (!isValidElement<{ children: ReactNode; value: { accentColor: string } }>(output)) {
      throw new Error('SubjectProvider did not return an element');
    }
    const wrapper = output.props.children;
    if (!isValidElement<{ style: CSSProperties & { '--accent': string } }>(wrapper)) {
      throw new Error('SubjectProvider wrapper is missing');
    }

    expect(output.props.value.accentColor).toBe('#245398');
    expect(wrapper.props.style['--accent']).toBe('#245398');
  });

  it('keeps token colors for existing callers without a catalog override', () => {
    const output = SubjectProvider({ slug: 'informatics', children: 'subject content' });

    if (!isValidElement<{ children: ReactNode; value: { accentColor: string } }>(output)) {
      throw new Error('SubjectProvider did not return an element');
    }
    const wrapper = output.props.children;
    if (!isValidElement<{ style: CSSProperties & { '--accent': string } }>(wrapper)) {
      throw new Error('SubjectProvider wrapper is missing');
    }

    expect(output.props.value.accentColor).toBe('#16a34a');
    expect(wrapper.props.style['--accent']).toBe('#16a34a');
  });

  it.each(['red', '#fff', '#12345G', '#112233; color: white'])('falls back when a catalog accent is not a six-digit hex color: %s', (accentColor) => {
    const output = SubjectProvider({ slug: 'informatics', accentColor, children: 'subject content' });

    if (!isValidElement<{ children: ReactNode; value: { accentColor: string } }>(output)) {
      throw new Error('SubjectProvider did not return an element');
    }
    const wrapper = output.props.children;
    if (!isValidElement<{ style: CSSProperties & { '--accent': string } }>(wrapper)) {
      throw new Error('SubjectProvider wrapper is missing');
    }

    expect(output.props.value.accentColor).toBe('#16a34a');
    expect(wrapper.props.style['--accent']).toBe('#16a34a');
  });
  it.each([undefined, '#245398', 'red'])('marks the wrapper as a subject scope (accent %s)', (accentColor) => {
    const output = SubjectProvider({ slug: 'informatics', accentColor, children: 'subject content' });
    if (!isValidElement<{ children: ReactNode }>(output)) throw new Error('SubjectProvider did not return an element');
    const wrapper = output.props.children;
    if (!isValidElement<{ 'data-subject-scope'?: string }>(wrapper)) throw new Error('SubjectProvider wrapper is missing');
    expect(wrapper.props['data-subject-scope']).toBe('');
  });
});
