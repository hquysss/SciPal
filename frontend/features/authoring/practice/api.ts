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

/** Published practice questions of a subject, for "Lấy từ bài khác". */
export const listPracticeQuestions = (filters: { subject_id: string; q?: string; page?: number }) =>
  authoringCall<QuestionPage>(`/api/authoring/questions${queryString({ usage: 'practice', status: 'published', ...filters })}`, 'GET');

/** The questions a lesson uses, including ones reused from other lessons. */
export const fetchQuestionsByIds = (ids: string[]) =>
  authoringCall<QuestionPage>(`/api/authoring/questions${queryString({ usage: 'practice', ids: ids.join(',') })}`, 'GET');

export const createQuestion = (input: QuestionPayload) => authoringCall<{ question: AuthorQuestion }>('/api/authoring/questions', 'POST', input);

export const updateQuestion = (id: string, input: QuestionPayload) =>
  authoringCall<{ question: AuthorQuestion }>(`/api/authoring/questions/${encodeURIComponent(id)}`, 'PATCH', input);
