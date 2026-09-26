// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLanguage } from '../useLanguage';

describe('useLanguage', () => {
  beforeEach(() => localStorage.clear());

  it('defaults to "vi"', () => {
    const { result } = renderHook(() => useLanguage());
    expect(result.current.lang).toBe('vi');
  });

  it('t() returns vi text by default', () => {
    const { result } = renderHook(() => useLanguage());
    expect(result.current.t({ en: 'Hello', vi: 'Xin chào' })).toBe('Xin chào');
  });

  it('switches to en and t() returns en text', () => {
    const { result } = renderHook(() => useLanguage());
    act(() => result.current.setLang('en'));
    expect(result.current.lang).toBe('en');
    expect(result.current.t({ en: 'Hello', vi: 'Xin chào' })).toBe('Hello');
  });

  it('persists language choice to localStorage', () => {
    const { result } = renderHook(() => useLanguage());
    act(() => result.current.setLang('en'));
    expect(localStorage.getItem('scipal-lang')).toBe('en');
  });

  it('updates the document language when the visitor changes languages', () => {
    const { result } = renderHook(() => useLanguage());
    act(() => result.current.setLang('en'));
    expect(document.documentElement.lang).toBe('en');
  });

  it('reads persisted language on mount', () => {
    localStorage.setItem('scipal-lang', 'en');
    const { result } = renderHook(() => useLanguage());
    expect(result.current.lang).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });
});
