// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassManageButtons } from './ClassManageButtons';
import { deleteClass, renameClass } from './classActions';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('./classActions', () => ({ renameClass: vi.fn(), deleteClass: vi.fn() }));

const rename = vi.mocked(renameClass);
const remove = vi.mocked(deleteClass);
const ok = { ok: true as const, data: { success: true as const } };
const fail = { ok: false as const, status: 500, error: { vi: 'Không xoá được lớp học.', en: 'x' } };

function setup() {
  const onRenamed = vi.fn();
  const onDeleted = vi.fn();
  render(<ClassManageButtons classId="c1" name="10A1" onRenamed={onRenamed} onDeleted={onDeleted} />);
  return { onRenamed, onDeleted };
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('ClassManageButtons', () => {
  it('asks before deleting and does nothing when the teacher cancels', async () => {
    const { onDeleted } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Xoá lớp' }));
    expect(await screen.findByText(/danh sách học sinh, bài giao, game và tin nhắn/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    await waitFor(() => expect(screen.queryByText(/Không thể hoàn tác/)).toBeNull());
    expect(remove).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('deletes after confirmation and tells the page', async () => {
    remove.mockResolvedValue(ok);
    const { onDeleted } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Xoá lớp' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá lớp vĩnh viễn' }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(remove).toHaveBeenCalledWith('c1');
  });

  it('keeps the class and shows the server message when the delete fails', async () => {
    remove.mockResolvedValue(fail);
    const { onDeleted } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Xoá lớp' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá lớp vĩnh viễn' }));
    expect(await screen.findByText('Không xoá được lớp học.')).toBeTruthy();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('renames with the trimmed name and reports the saved one', async () => {
    rename.mockResolvedValue({ ok: true, data: { class_room: { id: 'c1', name: '10A2' } } });
    const { onRenamed } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Đổi tên' }));
    const input = await screen.findByLabelText('Tên lớp học');
    expect((input as HTMLInputElement).value).toBe('10A1');
    fireEvent.change(input, { target: { value: '  10A2  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu tên' }));
    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith('10A2'));
    expect(rename).toHaveBeenCalledWith('c1', '10A2');
  });

  it('will not save a blank name', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Đổi tên' }));
    fireEvent.change(await screen.findByLabelText('Tên lớp học'), { target: { value: '   ' } });
    expect((screen.getByRole('button', { name: 'Lưu tên' }) as HTMLButtonElement).disabled).toBe(true);
    expect(rename).not.toHaveBeenCalled();
  });
});
