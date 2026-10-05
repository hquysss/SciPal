import { EXAM_FORMATS, type ExamFormat, type ExamSection } from '@scipal/types';
import type { ExamQuestionItem } from './ExamRunner';

export interface BlueprintSummary {
  id: string;
  name: string;
  /** English exam title; null for exams made before titles were bilingual. */
  name_en?: string | null;
  grade: number | null;
  subject_id: string | null;
  subject_slug: string | null;
  subject_name_en: string | null;
  subject_name_vi: string | null;
  question_count: number;
  duration_minutes?: number | null;
  /** THPTQG and ĐGNL exams are served in sections; `generic` (and older servers) are not. */
  format: ExamFormat;
  /** The exam's sections and passage groups; null for a generic exam. */
  layout: ExamSection[] | null;
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

/** An exam from an older server, or with an unknown format or a malformed layout, is a generic exam. */
function withFormat(blueprint: Partial<BlueprintSummary>): BlueprintSummary {
  const format = (EXAM_FORMATS as readonly unknown[]).includes(blueprint.format) ? (blueprint.format as ExamFormat) : 'generic';
  const layout = Array.isArray(blueprint.layout) && blueprint.layout.length > 0 ? blueprint.layout : null;
  return { ...blueprint, format, layout } as BlueprintSummary;
}

export async function getExamBlueprint(blueprintId: string): Promise<ExamDetailResult> {
  try {
    const res = await fetch(`${API_BASE}/api/exam/${encodeURIComponent(blueprintId)}/questions`, { cache: 'no-store' });
    if (res.status === 404) return { kind: 'not_found' };
    if (!res.ok) return { kind: 'error' };
    const payload = (await res.json()) as { blueprint?: Partial<BlueprintSummary>; questions?: unknown };
    return payload.blueprint && Array.isArray(payload.questions)
      ? { kind: 'ok', blueprint: withFormat(payload.blueprint), questions: payload.questions as ExamQuestionItem[] }
      : { kind: 'error' };
  } catch (err) {
    console.warn('getExamBlueprint failed:', err);
    return { kind: 'error' };
  }
}
