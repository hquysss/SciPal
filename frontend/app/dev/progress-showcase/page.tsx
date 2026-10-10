import { notFound } from 'next/navigation';
import { ProgressView } from '@/features/progress/ProgressView';
import { buildRoadmap } from '@/features/progress/progressModel';
import type { LeaderRow, ProgressSummary } from '@/features/progress/progressQueries';

// Dev only: the progress page for a sample student, no account needed.
// ?state=new (nothing started) · ?board=empty|failed|below
export default async function ProgressShowcasePage({ searchParams }: { searchParams: Promise<{ board?: string; state?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { board, state } = await searchParams;

  const names = ['Minh Anh', 'Gia Bảo', 'Thu Hà', 'Quốc Huy', 'Khánh Linh', 'Đức Nam', 'Phương Vy', 'Hoàng Long', 'Bảo Ngọc', 'Tuấn Kiệt'];
  const top: LeaderRow[] = names.map((n, i) => ({ rank: i + 1, display_name: n, xp: 2400 - i * 180, is_me: !board && i === 3 }));
  const leaderboard: ProgressSummary['leaderboard'] =
    board === 'failed' ? null
      : board === 'empty' ? { week: [], all: [] }
        : { week: board === 'below' ? [...top, { rank: 27, display_name: 'Lê An', xp: 340, is_me: true }] : top, all: top.map((r) => ({ ...r, xp: r.xp * 6 })) };

  const empty: ProgressSummary = {
    completedLessons: [], streaks: [], totalXP: 0, badges: [], leaderboard, roadmaps: [], continueMinutes: null, exams: [], loadFailed: false,
  };
  if (state === 'new') return <ProgressView {...empty} />;

  const lesson = (id: string, vi: string, en: string) => ({ id, slug: id, title_vi: vi, title_en: en, sort_order: Number(id.slice(-1)), grade: 10 });
  const tin = { id: 'tin', slug: 'tin-hoc', name: { vi: 'Tin học', en: 'Informatics' }, accent: 'var(--sky)' };
  const ly = { id: 'ly', slug: 'vat-ly', name: { vi: 'Vật lý', en: 'Physics' }, accent: 'var(--coral)' };
  const done = new Map([
    ['t11', '2026-09-28T09:00:00Z'], ['t12', '2026-09-30T09:00:00Z'], ['t13', '2026-10-02T09:00:00Z'],
    ['t21', '2026-10-05T09:00:00Z'], ['t22', '2026-10-07T09:00:00Z'],
    ['p11', '2026-10-08T09:00:00Z'],
  ]);
  const roadmaps = [
    buildRoadmap(tin, [
      { id: 'tin1', name_vi: 'Máy tính và xã hội tri thức', name_en: 'Computers and the knowledge society', sort_order: 1, grade: 10,
        lessons: [lesson('t11', 'Thông tin và dữ liệu', 'Information and data'), lesson('t12', 'Biểu diễn thông tin', 'Representing information'), lesson('t13', 'Hệ nhị phân', 'The binary system')] },
      { id: 'tin2', name_vi: 'Lập trình Python cơ bản', name_en: 'Python basics', sort_order: 2, grade: 10,
        lessons: [lesson('t21', 'Biến và kiểu dữ liệu', 'Variables and data types'), lesson('t22', 'Câu lệnh rẽ nhánh', 'Branching'), lesson('t23', 'Vòng lặp for', 'For loops'), lesson('t24', 'Hàm trong Python', 'Functions in Python')] },
      { id: 'tin3', name_vi: 'Thuật toán sắp xếp và tìm kiếm', name_en: 'Sorting and searching', sort_order: 3, grade: 10,
        lessons: [lesson('t31', 'Sắp xếp nổi bọt', 'Bubble sort'), lesson('t32', 'Tìm kiếm nhị phân', 'Binary search')] },
    ], done),
    buildRoadmap(ly, [
      { id: 'ly1', name_vi: 'Động học', name_en: 'Kinematics', sort_order: 1, grade: 10,
        lessons: [lesson('p11', 'Chuyển động thẳng đều', 'Uniform motion'), lesson('p12', 'Gia tốc', 'Acceleration')] },
    ], done),
  ];
  const titles = Object.fromEntries(roadmaps.flatMap((r) => r.chapters.flatMap((c) => c.lessons.map((l) => [l.id, { ...l.title, subject: r.subject }]))));
  const completedLessons: ProgressSummary['completedLessons'] = [...done.entries()].reverse().map(([id, at]) => ({
    id: `p-${id}`, lesson_id: id, score: 100, completed_at: at,
    lessons: { title_vi: titles[id].vi, title_en: titles[id].en, subjects: { name_vi: titles[id].subject.name.vi, name_en: titles[id].subject.name.en } },
  }));

  return (
    <ProgressView
      {...empty}
      totalXP={1340}
      completedLessons={completedLessons}
      streaks={[{ subject_id: 'tin', current_streak: 4, last_active: new Date().toISOString().slice(0, 10), subjects: { name_vi: 'Tin học', name_en: 'Informatics', accent_color: 'var(--sky)' } }]}
      badges={[{ earned_at: '2026-10-02T10:00:00Z', badges: { name_vi: 'Bước đầu', name_en: 'First steps', icon: '🌱' } }]}
      roadmaps={roadmaps}
      continueMinutes={12}
      exams={[
        { blueprintId: 'e2', name: 'Kiểm tra giữa kì Tin học 10', score: 4.25, maxScore: 10, submittedAt: '2026-10-06T08:00:00Z' },
        { blueprintId: 'e1', name: 'Đề luyện THPTQG Tin học số 1', score: 8.5, maxScore: 10, submittedAt: '2026-10-03T08:00:00Z' },
      ]}
    />
  );
}
