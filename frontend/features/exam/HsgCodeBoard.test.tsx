// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PublicPracticeQuestion } from '@scipal/types';
import { HsgCodeBoard } from './HsgCodeBoard';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('../../lib/theme/useShellDark', () => ({ useShellDark: () => false }));
vi.mock('@/features/lessons/practiceApi', () => ({ fetchSolvedCode: vi.fn(async () => []), runCode: vi.fn(), submitCode: vi.fn() }));

afterEach(cleanup);

const subject = { slug: 'informatics', name_vi: 'Tin học', name_en: 'Informatics', accent_color: '#16a34a' };
const problem = (id: string, stem: string, difficulty = 1): PublicPracticeQuestion => ({
  id,
  type: 'code',
  difficulty,
  data: {
    stem: { vi: stem, en: stem },
    input_spec: { vi: 'Một số N.', en: 'N.' },
    output_spec: { vi: 'Kết quả.', en: 'Result.' },
    time_limit_ms: 2000,
    memory_limit_mb: 256,
    starter: {},
    samples: [{ input: '30\n', expected: '2 3 5 7 23 29\n' }],
  },
});

describe('HsgCodeBoard', () => {
  it('shows the breadcrumb and the problem list of lesson practice, and opens a problem', () => {
    render(<HsgCodeBoard subject={subject} questions={[problem('a', 'Số siêu nguyên tố (SPRIME). Tìm'), problem('b', 'Nguyên tố đối xứng (PPRIME). Đếm', 2)]} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Bồi dưỡng HSG Tin học' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Phòng thi thử' }).getAttribute('href')).toBe('/exam');
    fireEvent.click(screen.getByRole('button', { name: /Bài 1: Số siêu nguyên tố \(SPRIME\)/ }));
    expect(screen.getByText('Bài 1 / 2')).toBeTruthy();
  });

  it('says so when there are no problems yet', () => {
    render(<HsgCodeBoard subject={subject} questions={[]} />);
    expect(screen.getByText('Chưa có bài')).toBeTruthy();
  });
});
