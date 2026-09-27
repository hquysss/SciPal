import { describe, expect, it } from 'vitest';
import { leavingHref } from './leaveGuard';

const here = new URL('https://scipal.test/teacher/lessons/abc');
const click = (anchor: Partial<{ href: string; target: string; download: boolean }> | null, extra: Partial<{ button: number; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean; defaultPrevented: boolean }> = {}) => ({
  button: 0,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  defaultPrevented: false,
  ...extra,
  anchor: anchor ? { href: '', target: '', download: false, ...anchor } : null,
});

describe('leavingHref', () => {
  it('flags an in-app link that leaves the editor', () => {
    expect(leavingHref(click({ href: 'https://scipal.test/teacher/lessons' }), here)).toBe('https://scipal.test/teacher/lessons');
  });

  it('ignores clicks that keep the editor open', () => {
    expect(leavingHref(click(null), here)).toBeNull();
    expect(leavingHref(click({ href: 'https://scipal.test/teacher/lessons/abc#part' }), here)).toBeNull();
    expect(leavingHref(click({ href: 'https://scipal.test/x', target: '_blank' }), here)).toBeNull();
    expect(leavingHref(click({ href: 'https://scipal.test/templates/a.docx', download: true }), here)).toBeNull();
    expect(leavingHref(click({ href: 'https://scipal.test/x' }, { ctrlKey: true }), here)).toBeNull();
    expect(leavingHref(click({ href: 'https://scipal.test/x' }, { button: 1 }), here)).toBeNull();
    expect(leavingHref(click({ href: 'https://scipal.test/x' }, { defaultPrevented: true }), here)).toBeNull();
  });
});
