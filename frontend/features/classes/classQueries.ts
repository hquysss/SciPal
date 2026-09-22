import type { ClassRoomItem } from './ClassList';
import type { StudentMember } from './StudentRoster';

export async function getTeacherClasses(teacherId?: string): Promise<ClassRoomItem[]> {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

  try {
    const res = await fetch(`${API_BASE}/api/classes`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.classes)) return data.classes;
    }
  } catch (err) {
    console.warn('getTeacherClasses fetch warning, returning demo classes:', err);
  }

  // Fallback demo classrooms
  return [
    {
      id: 'cls-10a1',
      name: 'Lớp 10A1 — Chuyên đề Tin học',
      subject_id: 'informatics',
      invite_code: 'INF10A',
      student_count: 32,
      created_at: '2026-09-01T08:00:00Z',
    },
    {
      id: 'cls-11b2',
      name: 'Lớp 11B2 — Cơ sở dữ liệu & Thuật toán',
      subject_id: 'informatics',
      invite_code: 'INF11B',
      student_count: 28,
      created_at: '2026-09-05T09:30:00Z',
    },
    {
      id: 'cls-stem',
      name: 'Câu lạc bộ Khoa học Tự nhiên STEM',
      subject_id: 'physics',
      invite_code: 'STEM99',
      student_count: 18,
      created_at: '2026-09-10T14:00:00Z',
    },
  ];
}

export async function getClassRoster(classId: string): Promise<{
  classRoom: { name: string; invite_code: string };
  members: StudentMember[];
}> {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

  try {
    const res = await fetch(`${API_BASE}/api/classes/${classId}/roster`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return {
        classRoom: {
          name: data.class_room?.name ?? 'Lớp học SciPal',
          invite_code: data.class_room?.invite_code ?? 'SP10A1',
        },
        members: data.members.map((m: any) => ({
          student_id: m.student_id ?? m.id,
          display_name: m.profiles?.display_name ?? m.display_name ?? 'Học sinh SciPal',
          joined_at: m.joined_at ?? new Date().toISOString(),
          total_xp: m.total_xp ?? 350,
          completed_lessons: m.completed_lessons ?? 4,
        })),
      };
    }
  } catch (err) {
    console.warn('getClassRoster fetch warning, returning demo roster:', err);
  }

  // Fallback demo roster
  return {
    classRoom: {
      name: 'Lớp 10A1 — Chuyên đề Tin học',
      invite_code: 'INF10A',
    },
    members: [
      { student_id: 's1', display_name: 'Nguyễn Hoàng Long', joined_at: '2026-09-02', total_xp: 680, completed_lessons: 6 },
      { student_id: 's2', display_name: 'Trần Thảo My', joined_at: '2026-09-03', total_xp: 540, completed_lessons: 5 },
      { student_id: 's3', display_name: 'Lê Minh Khôi', joined_at: '2026-09-04', total_xp: 490, completed_lessons: 4 },
      { student_id: 's4', display_name: 'Phạm Gia Hân', joined_at: '2026-09-05', total_xp: 420, completed_lessons: 4 },
      { student_id: 's5', display_name: 'Vũ Đức Trí', joined_at: '2026-09-06', total_xp: 310, completed_lessons: 3 },
    ],
  };
}
