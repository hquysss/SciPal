import type { AuthorQuestionInput, QuestionStatus, QuestionType } from '@scipal/types';
import { authoringCall, queryString, type ApiResult } from '../apiClient';

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

/** The server answers at most this many ids per request; an exam may list 200 questions. */
export const IDS_PER_REQUEST = 100;

/** The questions a lesson or exam uses, including ones by other authors, in batches the server accepts. */
export async function fetchQuestionsByIds(ids: string[], usage: 'practice' | 'exam' = 'practice'): Promise<ApiResult<QuestionPage>> {
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += IDS_PER_REQUEST) batches.push(ids.slice(i, i + IDS_PER_REQUEST));
  const pages = await Promise.all(
    batches.map((batch) => authoringCall<QuestionPage>(`/api/authoring/questions${queryString({ usage, ids: batch.join(',') })}`, 'GET')),
  );
  const failed = pages.find((page) => !page.ok);
  if (failed) return failed;
  const questions = pages.flatMap((page) => (page.ok ? page.data.questions : []));
  return { ok: true, data: { questions, page: 1, page_size: questions.length, total: questions.length } };
}

export const deleteQuestion = (id: string) => authoringCall<Record<string, never>>(`/api/authoring/questions/${encodeURIComponent(id)}`, 'DELETE');

export const createQuestion = (input: QuestionPayload) => authoringCall<{ question: AuthorQuestion }>('/api/authoring/questions', 'POST', input);

export const updateQuestion = (id: string, input: QuestionPayload) =>
  authoringCall<{ question: AuthorQuestion }>(`/api/authoring/questions/${encodeURIComponent(id)}`, 'PATCH', input);
