// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LandingSubject } from './getLandingData';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (copy: { vi: string }) => copy.vi }) }));
vi.mock('@scipal/ui', () => ({ SubjectProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/subject/SubjectIcon', () => ({ SubjectIcon: () => <span aria-hidden="true" /> }));
vi.mock('@/components/mascot/Mascot', () => ({ Mascot: () => <span aria-hidden="true" /> }));
vi.mock('./countUp', () => ({ useInView: () => true }));

import { SubjectSpotlight } from './SubjectSpotlight';

let prefersReducedMotion = false;
let canHover = true;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.useFakeTimers();
  prefersReducedMotion = false;
  canHover = true;
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? prefersReducedMotion : canHover,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

const subjects: LandingSubject[] = [
  { id: 'math', slug: 'math', name_en: 'Mathematics', name_vi: 'Toán', icon: '∑', icon_url: null, accent_color: '#16a34a', sort_order: 1, education_level: 'upper_secondary', status: 'active', liveGrades: [10] },
  { id: 'physics', slug: 'physics', name_en: 'Physics', name_vi: 'Vật lí', icon: '⚛', icon_url: null, accent_color: '#2563eb', sort_order: 2, education_level: 'upper_secondary', status: 'active', liveGrades: [10] },
];

describe('SubjectSpotlight motion control', () => {
  it('advances automatically and pauses while the reader hovers the carousel', async () => {
    const { container } = render(<SubjectSpotlight level="upper_secondary" catalog={{ kind: 'ready', subjects }} />);
    const stage = container.querySelector('[data-subject-carousel-stage]');
    expect(stage).not.toBeNull();

    fireEvent.pointerEnter(stage!);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });
    expect(screen.getByRole('heading', { name: 'Học Toán Song Ngữ' })).toBeTruthy();

    fireEvent.pointerLeave(stage!);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(screen.getByRole('heading', { name: 'Học Vật lí Song Ngữ' })).toBeTruthy();
  });

  it('pauses while a keyboard user focuses carousel controls', async () => {
    const { container } = render(<SubjectSpotlight level="upper_secondary" catalog={{ kind: 'ready', subjects }} />);
    const stage = container.querySelector('[data-subject-carousel-stage]');
    const next = screen.getByRole('button', { name: 'Môn tiếp theo' });
    fireEvent.pointerEnter(stage!);
    fireEvent.focus(next);
    fireEvent.pointerLeave(stage!);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });
    expect(screen.getByRole('heading', { name: 'Học Toán Song Ngữ' })).toBeTruthy();
    fireEvent.click(next);
    expect(screen.getByRole('heading', { name: 'Học Vật lí Song Ngữ' })).toBeTruthy();
  });

  it('keeps automatic changes off when reduced motion is requested', async () => {
    prefersReducedMotion = true;
    render(<SubjectSpotlight level="upper_secondary" catalog={{ kind: 'ready', subjects }} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });

    expect(screen.getByRole('heading', { name: 'Học Toán Song Ngữ' })).toBeTruthy();
  });

  it('keeps the carousel manual on touch devices without hover', async () => {
    canHover = false;
    render(<SubjectSpotlight level="upper_secondary" catalog={{ kind: 'ready', subjects }} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });

    expect(screen.getByRole('heading', { name: 'Học Toán Song Ngữ' })).toBeTruthy();
  });
});
