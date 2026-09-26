import type { ClassRoomItem } from './ClassList';
import type { StudentMember } from './StudentRoster';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

export type TeacherClassesResult =
  | { kind: 'ready'; classes: ClassRoomItem[] }
  | { kind: 'error' };

export type ClassRosterResult =
  | { kind: 'ready'; classRoom: { name: string; invite_code: string }; members: StudentMember[] }
  | { kind: 'not_found' }
  | { kind: 'error' };

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function getTeacherClasses(token: string): Promise<TeacherClassesResult> {
  try {
    const res = await fetch(`${API_BASE}/api/classes`, { cache: 'no-store', headers: authHeaders(token) });
    if (!res.ok) return { kind: 'error' };
    const data = await res.json();
    return Array.isArray(data.classes) ? { kind: 'ready', classes: data.classes } : { kind: 'error' };
  } catch (err) {
    console.warn('getTeacherClasses failed:', err);
    return { kind: 'error' };
  }
}

export async function getClassRoster(classId: string, token: string): Promise<ClassRosterResult> {
  try {
    const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/roster`, {
      cache: 'no-store',
      headers: authHeaders(token),
    });
    if (res.status === 404) return { kind: 'not_found' };
    if (!res.ok) return { kind: 'error' };
    const data = await res.json();
    if (!data.class_room || !Array.isArray(data.members)) return { kind: 'error' };
    return {
      kind: 'ready',
      classRoom: { name: data.class_room.name, invite_code: data.class_room.invite_code },
      members: data.members as StudentMember[],
    };
  } catch (err) {
    console.warn('getClassRoster failed:', err);
    return { kind: 'error' };
  }
}
