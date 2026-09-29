import { authoringCall, queryString, type ApiResult } from '../authoring/apiClient';

// Class assignments from the backend (routes/assignments.ts). "Done" is decided by the server.

type Bilingual = { vi: string; en: string };

export type TeacherAssignment = {
  id: string;
  kind: 'lesson' | 'exam';
  contentId: string;
  title: Bilingual;
  href: string | null;
  published: boolean;
  dueAt: string | null;
  createdAt: string;
  doneCount: number;
  memberCount: number;
};

export type MyAssignment = { id: string; kind: 'lesson' | 'exam'; title: Bilingual; href: string; dueAt: string | null; createdAt: string; done: boolean };
export type MyClass = { id: string; name: string; teacherName: string | null; subject: Bilingual | null; assignments: MyAssignment[] };
export type AssignableItem = { id: string; title: Bilingual };

const base = (classId: string) => `/api/classes/${encodeURIComponent(classId)}`;

export const listAssignments = (classId: string): Promise<ApiResult<{ assignments: TeacherAssignment[] }>> =>
  authoringCall(`${base(classId)}/assignments`, 'GET');

export const createAssignment = (classId: string, body: { lessonId?: string; blueprintId?: string; dueAt: string | null }): Promise<ApiResult<{ id: string }>> =>
  authoringCall(`${base(classId)}/assignments`, 'POST', body);

export const removeAssignment = (classId: string, assignmentId: string): Promise<ApiResult<Record<string, never>>> =>
  authoringCall(`${base(classId)}/assignments/${encodeURIComponent(assignmentId)}`, 'DELETE');

export const searchAssignable = (classId: string, kind: 'lesson' | 'exam', q: string): Promise<ApiResult<{ items: AssignableItem[] }>> =>
  authoringCall(`${base(classId)}/assignable${queryString({ kind, q })}`, 'GET');

export const listMyClasses = (): Promise<ApiResult<{ classes: MyClass[] }>> => authoringCall('/api/classes/mine', 'GET');

const DAY = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit' });
/** "05/10" (day/month) in Vietnam time, the same in every runtime. */
export const shortDate = (iso: string) => {
  const parts = DAY.formatToParts(new Date(iso));
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('day')}/${part('month')}`;
};
