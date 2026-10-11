// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { defaultSimulationConfig } from '@scipal/types';
import { KneeReflexView } from './kneeReflex';

vi.mock('./kneeReflexScene', () => ({ KneeReflexScene: () => { throw new Error('WebGL unavailable'); } }));

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('still lets a learner select the six steps when the model cannot be rendered', async () => {
  render(<KneeReflexView config={defaultSimulationConfig('knee-reflex')} lang="vi" />);
  await screen.findByText(/Trình duyệt này không mở được mô hình 3D/);
  const response = screen.getByRole('button', { name: /06.*Đáp ứng/ });
  fireEvent.click(response);
  expect(response.getAttribute('aria-pressed')).toBe('true');
  // The slider's <output> is also a status region, so pick the one that explains the step.
  expect(screen.getAllByRole('status').some((region) => region.textContent?.includes('Cơ tứ đầu đùi co'))).toBe(true);
});
