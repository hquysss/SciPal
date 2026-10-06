// @vitest-environment jsdom
import { useEffect } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NotFound from './not-found';

const state = vi.hoisted(() => ({ lang: 'vi' as 'vi' | 'en', fallback: false, push: vi.fn(), back: vi.fn() }));
vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang: state.lang, t: (copy: { en: string; vi: string }) => copy[state.lang] }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: state.push, back: state.back }) }));
vi.mock('next/dynamic', () => ({
  default: () => function Scene({ onReady, onFallback }: { onReady: () => void; onFallback: () => void }) {
    useEffect(() => { (state.fallback ? onFallback : onReady)(); }, [onReady, onFallback]);
    return <div aria-hidden="true" />;
  },
}));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
beforeEach(() => { state.lang = 'vi'; state.fallback = false; vi.clearAllMocks(); vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {}); });

describe('cinematic 404 recovery', () => {
  it('stops the soundtrack when leaving the page', () => {
    const { unmount } = render(<NotFound />);
    unmount();
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce();
  });

  it('waits for the audio control before playing music', () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    render(<NotFound />);
    expect(play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Bật nhạc Interstellar' }));
    expect(play).toHaveBeenCalledOnce();
  });

  it('renders the SciPal Vietnamese recovery actions and scene', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { name: 'LẠC NGOÀI CHÂN TRỜI SỰ KIỆN' })).toBeTruthy();
    expect(screen.getByRole('main').getAttribute('data-scene-state')).toBe('ready');
    expect(screen.getByRole('main').getAttribute('lang')).toBe('vi');
    expect(screen.getByRole('link', { name: 'VỀ TRANG CHỦ' }).getAttribute('href')).toBe('/');
  });

  it('reads the current English language choice', () => {
    state.lang = 'en';
    render(<NotFound />);
    expect(screen.getByRole('heading', { name: 'LOST BEYOND THE EVENT HORIZON' })).toBeTruthy();
    expect(screen.getByRole('main').getAttribute('lang')).toBe('en');
  });

  it('recovers home when there is no previous page', () => {
    render(<NotFound />);
    fireEvent.click(screen.getByRole('button', { name: 'QUAY LẠI' }));
    expect(state.push).toHaveBeenCalledWith('/');
  });

  it('uses previous history when available', () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValueOnce(2);
    render(<NotFound />);
    fireEvent.click(screen.getByRole('button', { name: 'QUAY LẠI' }));
    expect(state.back).toHaveBeenCalledOnce();
  });

  it('keeps the recovery controls available without WebGL', () => {
    state.fallback = true;
    render(<NotFound />);
    expect(screen.getByRole('main').getAttribute('data-scene-state')).toBe('fallback');
    expect(screen.getByRole('link', { name: 'VỀ TRANG CHỦ' })).toBeTruthy();
  });
});
