import type { ExamFormat, ExamSection, QuestionType } from '@scipal/types';
import { authoringCall } from '../apiClient';

export type ExamStatus = 'draft' | 'pending_review' | 'published' | 'class_only';

/** An exam as `GET /api/authoring/exams` lists it. */
export interface ExamSummary {
  id: string;
  name: string;
  name_en: string | null;
  /** Where the exam comes from, when its author wrote it. */
  source?: string | null;
  /** Mã đề. */
  exam_code?: string | null;
  /** Năm của đề. */
  exam_year?: number | null;
  subject_id: string;
  subject_name_vi: string | null;
  grade: number | null;
  duration_minutes: number | null;
  status: ExamStatus;
  question_count: number;
  updated_at: string;
  created_by: string | null;
  imported: boolean;
  mine: boolean;
}

export interface ExamDetail extends ExamSummary {
  question_ids: string[];
  /** `generic` exams keep a flat list; others carry their sections in `layout`. */
  format: ExamFormat;
  layout: ExamSection[] | null;
  review_note: string | null;
  editable: boolean;
}

export interface ExamInput {
  name: string;
  name_en: string;
  source?: string;
  exam_code?: string;
  exam_year?: number | null;
  subject_id: string;
  grade: number;
  duration_minutes: number;
  question_ids: string[];
  /** Omitted means `generic` with no layout. For a layout exam the server derives `question_ids` from it. */
  format?: ExamFormat;
  layout?: ExamSection[] | null;
}

export interface DrawRequest {
  subject_id: string;
  grade?: number;
  exclude_ids?: string[];
  counts: Array<{ type: QuestionType; difficulty: 1 | 2 | 3; n: number }>;
}

export interface DrawResult {
  question_ids: string[];
  shortfalls: Array<{ type: QuestionType; difficulty: number; wanted: number; got: number }>;
}

const path = (id: string, action = '') => `/api/authoring/exams/${encodeURIComponent(id)}${action}`;

export const listExams = (status?: ExamStatus) =>
  authoringCall<{ exams: ExamSummary[] }>(`/api/authoring/exams${status ? `?status=${status}` : ''}`, 'GET');
export const getExam = (id: string) => authoringCall<{ exam: ExamDetail }>(path(id), 'GET');
/** `publish` is honoured for admins only ("Xuất bản ngay"). */
export const createExam = (input: ExamInput & { publish?: boolean }) => authoringCall<{ exam: ExamDetail }>('/api/authoring/exams', 'POST', input);
export const updateExam = (id: string, input: Partial<ExamInput> & { expected_updated_at: string }) =>
  authoringCall<{ exam: ExamDetail }>(path(id), 'PATCH', input);
export const deleteExam = (id: string) => authoringCall<Record<string, never>>(path(id), 'DELETE');
export const drawExamQuestions = (body: DrawRequest) => authoringCall<DrawResult>('/api/authoring/exams/draw', 'POST', body);
export const submitExam = (id: string) => authoringCall<{ exam: ExamDetail }>(path(id, '/submit'), 'POST');
export const shareExamWithClasses = (id: string) => authoringCall<{ exam: ExamDetail }>(path(id, '/class-only'), 'POST');
export const withdrawExam = (id: string) => authoringCall<{ exam: ExamDetail }>(path(id, '/withdraw'), 'POST');
export const approveExam = (id: string) => authoringCall<{ exam: ExamDetail }>(path(id, '/approve'), 'POST');
export const rejectExam = (id: string, note: string) => authoringCall<{ exam: ExamDetail }>(path(id, '/reject'), 'POST', { note });
