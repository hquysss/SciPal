// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { defaultSimulationConfig } from '@scipal/types';
import { SkinView } from './skin';

vi.mock('./skinScene', () => ({ SkinScene: () => { throw new Error('WebGL unavailable'); } }));

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('still explains each receptor and its threshold when the model cannot be rendered', async () => {
  render(<SkinView config={defaultSimulationConfig('skin-senses')} lang="vi" />);
  await screen.findByText(/Trình duyệt này không mở được mô hình 3D/);
  expect(screen.getByText('Thụ thể xúc giác (tiểu thể Meissner)')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Gai nhọn' }));
  expect(screen.getByText('Thụ thể đau (đầu mút dây thần kinh tự do)')).toBeTruthy();
  fireEvent.change(screen.getByRole('slider'), { target: { value: '30' } });
  expect(screen.getByText(/không phát xung \(dưới ngưỡng\)/)).toBeTruthy();
});

it('lets a learner damage a part of the reflex arc', async () => {
  render(<SkinView config={{ ...defaultSimulationConfig('skin-senses'), view: 'reflex' }} lang="vi" />);
  await screen.findByText(/Trình duyệt này không mở được mô hình 3D/);
  const efferent = screen.getByRole('checkbox', { name: /Đường dẫn truyền li tâm/ });
  fireEvent.click(efferent);
  expect((efferent as HTMLInputElement).checked).toBe(true);
});
