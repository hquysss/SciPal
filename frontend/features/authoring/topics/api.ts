import { authoringCall, queryString } from '../apiClient';

/** A topic as the admin topic list shows it, with how many lessons it holds. */
export interface ManagedTopic {
  id: string;
  subject_id: string;
  slug: string;
  grade: number | null;
  name_en: string;
  name_vi: string;
  sort_order: number;
  lesson_count: number;
}

type Names = { name_vi: string; name_en: string };
const path = (id: string, suffix = '') => `/api/authoring/topics/${encodeURIComponent(id)}${suffix}`;

export const listTopics = (subjectId: string, grade: number) =>
  authoringCall<{ topics: ManagedTopic[] }>(`/api/authoring/topics${queryString({ subject_id: subjectId, grade })}`, 'GET');
export const createTopic = (subjectId: string, grade: number, names: Names) =>
  authoringCall<{ topic: ManagedTopic }>('/api/authoring/topics', 'POST', { subject_id: subjectId, grade, ...names });
export const renameTopic = (id: string, names: Names) => authoringCall<{ topic: ManagedTopic }>(path(id), 'PATCH', names);
export const moveTopic = (id: string, direction: 'up' | 'down') => authoringCall<Record<string, never>>(path(id, '/move'), 'POST', { direction });
export const deleteTopic = (id: string) => authoringCall<Record<string, never>>(path(id), 'DELETE');
