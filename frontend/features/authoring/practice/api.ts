import type { AuthorQuestionInput, QuestionStatus, QuestionType } from '@scipal/types';
import { authoringCall, queryString } from '../apiClient';

/** A question as the authoring API returns it: answers only when `mine` or for an admin. */
export interface AuthorQuestion {
  id: string;
  usage: 'practice' | 'exam';
  subject_id: string;
  lesson_id: string | null;
  grade: number | null;
  type: QuestionType;
  difficulty: number;
  status: QuestionStatus;
  created_at: string;
  mine: boolean;
  editable: boolean;
  data: Record<string, unknown>;
}

export interface QuestionPage {
  questions: AuthorQuestion[];
  page: number;
  page_size: number;
  total: number;
}

/** The body of a create or update; the server validates it again. */
export type QuestionPayload = Omit<AuthorQuestionInput, 'data'> & { data: Record<string, unknown> };

export interface QuestionFilters {
  usage: 'practice' | 'exam';
  subject_id?: string;
  grade?: number;
  type?: QuestionType;
  difficulty?: 1 | 2 | 3;
  status?: QuestionStatus;
  q?: string;
  page?: number;
}

/** One page of either question pool, as the author may see it. */
export const listQuestions = (filters: QuestionFilters) =>
  authoringCall<QuestionPage>(`/api/authoring/questions${queryString({ ...filters })}`, 'GET');

/** Published practice questions of a subject, for "Lấy từ bài khác". */
export const listPracticeQuestions = (filters: { subject_id: string; q?: string; page?: number }) =>
  listQuestions({ usage: 'practice', status: 'published', ...filters });

/** The questions a lesson or exam uses, including ones by other authors. */
export const fetchQuestionsByIds = (ids: string[], usage: 'practice' | 'exam' = 'practice') =>
  authoringCall<QuestionPage>(`/api/authoring/questions${queryString({ usage, ids: ids.join(',') })}`, 'GET');

export const deleteQuestion = (id: string) => authoringCall<Record<string, never>>(`/api/authoring/questions/${encodeURIComponent(id)}`, 'DELETE');

export const createQuestion = (input: QuestionPayload) => authoringCall<{ question: AuthorQuestion }>('/api/authoring/questions', 'POST', input);

export const updateQuestion = (id: string, input: QuestionPayload) =>
  authoringCall<{ question: AuthorQuestion }>(`/api/authoring/questions/${encodeURIComponent(id)}`, 'PATCH', input);
