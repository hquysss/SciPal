// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { fitWithin, PROFILE_IMAGE_LIMITS, profileNameProblem } from './profileApi';
import { ProfileEditor } from './ProfileEditor';
import { ProfileCard } from './ProfileCard';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
const refreshSession = vi.fn(async () => ({}));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({ auth: { refreshSession } }) }));

const api = vi.hoisted(() => ({
  saveDisplayName: vi.fn(),
  uploadProfileImage: vi.fn(),
  removeProfileImage: vi.fn(),
}));
vi.mock('./profileApi', async (importOriginal) => ({ ...(await importOriginal<object>()), ...api }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('profile helpers', () => {
  it('shrinks a picture to fit its longest side, never enlarging it', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(1000, 3000, 512)).toEqual({ width: 171, height: 512 });
    expect(fitWithin(300, 200, 512)).toEqual({ width: 300, height: 200 });
  });

  it('keeps the size caps of the server', () => {
    expect(PROFILE_IMAGE_LIMITS).toEqual({ avatar: 1024 * 1024, cover: 2 * 1024 * 1024 });
  });

  it('names what is wrong with a name', () => {
    expect(profileNameProblem('   ')?.vi).toContain('tên');
    expect(profileNameProblem('x'.repeat(51))?.vi).toContain('50');
    expect(profileNameProblem(' Lê An ')).toBeNull();
  });
});

const editor = (over: Partial<Parameters<typeof ProfileEditor>[0]> = {}) =>
  render(<ProfileEditor displayName="An" avatarUrl={null} coverUrl={null} onClose={() => {}} {...over} />);

describe('ProfileEditor', () => {
  it('saves a new name and refreshes the page and the account', async () => {
    api.saveDisplayName.mockResolvedValue({ ok: true, data: { display_name: 'Lê An' } });
    editor();
    fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: 'Lê An' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu tên' }));
    await waitFor(() => expect(api.saveDisplayName).toHaveBeenCalledWith('Lê An'));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(refreshSession).toHaveBeenCalled();
  });

  it('does not send an empty name', () => {
    editor();
    fireEvent.change(screen.getByLabelText('Tên hiển thị'), { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu tên' }));
    expect(api.saveDisplayName).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('tên');
  });

  it('uploads a chosen avatar as an avatar', async () => {
    api.uploadProfileImage.mockResolvedValue({ ok: true, data: { url: 'https://m/a.webp' } });
    editor();
    const file = new File([new Uint8Array([1])], 'a.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Đổi ảnh đại diện'), { target: { files: [file] } });
    await waitFor(() => expect(api.uploadProfileImage).toHaveBeenCalledWith('avatar', file));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('shows the server’s reason when an upload fails', async () => {
    api.uploadProfileImage.mockResolvedValue({ ok: false, status: 413, error: { vi: 'Ảnh bìa tối đa 2 MB.', en: 'x' } });
    editor();
    fireEvent.change(screen.getByLabelText('Đổi ảnh bìa'), { target: { files: [new File([new Uint8Array([1])], 'c.png', { type: 'image/png' })] } });
    expect((await screen.findByRole('alert')).textContent).toContain('2 MB');
  });

  it('removes a picture only when there is one', async () => {
    api.removeProfileImage.mockResolvedValue({ ok: true, data: {} });
    editor({ coverUrl: 'https://m/c.webp' });
    expect(screen.queryByRole('button', { name: 'Bỏ ảnh đại diện' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ ảnh bìa' }));
    await waitFor(() => expect(api.removeProfileImage).toHaveBeenCalledWith('cover'));
  });

  it('says the size limits and uses theme colours only', () => {
    const { container } = editor();
    expect(container.textContent).toContain('1 MB');
    expect(container.textContent).toContain('2 MB');
    expect(countRawColors(container.innerHTML).total).toBe(0);
  });
});

describe('ProfileCard', () => {
  const props = { displayName: 'An', role: 'student' as const, stats: { totalXP: 0, completedLessons: 0, longestStreak: 0 } };

  it('shows the cover photo instead of the colour band when there is one', () => {
    const html = renderToStaticMarkup(<ProfileCard {...props} coverUrl="https://m/c.webp" />);
    expect(html).toContain('src="https://m/c.webp"');
  });

  it('offers to edit the profile', () => {
    render(<ProfileCard {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sửa hồ sơ' }));
    expect(screen.getByLabelText('Tên hiển thị')).toBeTruthy();
  });
});
