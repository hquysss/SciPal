import type { ExamQuestionItem } from './ExamRunner';

export interface BlueprintSummary {
  id: string;
  name: string;
  grade: number | null;
  subject_id: string | null;
  subject_slug: string | null;
  subject_name_en: string | null;
  subject_name_vi: string | null;
  question_count: number;
}

export type BlueprintListResult = { kind: 'ok'; blueprints: BlueprintSummary[] } | { kind: 'error' };

export type ExamDetailResult =
  | { kind: 'ok'; blueprint: BlueprintSummary; questions: ExamQuestionItem[] }
  | { kind: 'not_found' }
  | { kind: 'error' };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

export async function getExamBlueprints(): Promise<BlueprintListResult> {
  try {
    const res = await fetch(`${API_BASE}/api/exam/blueprints`, { cache: 'no-store' });
    if (!res.ok) return { kind: 'error' };
    const payload = (await res.json()) as { blueprints?: unknown };
    return Array.isArray(payload.blueprints)
      ? { kind: 'ok', blueprints: payload.blueprints as BlueprintSummary[] }
      : { kind: 'error' };
  } catch (err) {
    console.warn('getExamBlueprints failed:', err);
    return { kind: 'error' };
  }
}

export async function getExamBlueprint(blueprintId: string): Promise<ExamDetailResult> {
  try {
    const res = await fetch(`${API_BASE}/api/exam/${encodeURIComponent(blueprintId)}/questions`, { cache: 'no-store' });
    if (res.status === 404) return { kind: 'not_found' };
    if (!res.ok) return { kind: 'error' };
    const payload = (await res.json()) as { blueprint?: BlueprintSummary; questions?: unknown };
    return payload.blueprint && Array.isArray(payload.questions)
      ? { kind: 'ok', blueprint: payload.blueprint, questions: payload.questions as ExamQuestionItem[] }
      : { kind: 'error' };
  } catch (err) {
    console.warn('getExamBlueprint failed:', err);
    return { kind: 'error' };
  }
}
