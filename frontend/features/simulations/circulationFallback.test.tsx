// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { defaultSimulationConfig } from '@scipal/types';
import { CirculationView } from './circulation';

vi.mock('./circulationScene', () => ({ CirculationScene: () => { throw new Error('WebGL unavailable'); } }));

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('still lets a learner go through the cardiac cycle when the model cannot be rendered', async () => {
  render(<CirculationView config={defaultSimulationConfig('circulation-3d')} lang="vi" />);
  await screen.findByText(/Trình duyệt này không mở được mô hình 3D/);
  // Reduced motion: the heart waits for the learner instead of beating on its own.
  expect(screen.getByRole('button', { name: /Chạy/ })).toBeTruthy();
  const ventricles = screen.getByRole('button', { name: 'Co thất' });
  fireEvent.click(ventricles);
  expect(ventricles.getAttribute('aria-pressed')).toBe('true');
  expect(screen.getAllByRole('status').some((region) => region.textContent?.includes('Pha co tâm thất'))).toBe(true);
  expect(screen.getByText(/đóng · mở/)).toBeTruthy();
});

it('shows the route of the chosen loop', async () => {
  render(<CirculationView config={{ ...defaultSimulationConfig('circulation-3d'), loop: 'pulmonary' }} lang="vi" />);
  await screen.findByText(/Trình duyệt này không mở được mô hình 3D/);
  expect(screen.getByText(/Tâm thất phải → động mạch phổi/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Vòng tuần hoàn lớn' }));
  expect(screen.getByText(/Tâm thất trái → động mạch chủ/)).toBeTruthy();
});
