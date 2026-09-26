// backend/src/catalog/catalog.ts
import { readFileSync } from 'node:fs';

export type CurriculumRole = 'required' | 'elective_choice' | 'optional' | 'required_activity';
export const CURRICULUM_ROLES: readonly CurriculumRole[] = ['required', 'elective_choice', 'optional', 'required_activity'];

export interface CatalogSubject {
  slug: string;
  name_en: string;
  name_vi: string;
  icon: string;
  accent_color: string;
  grades: Array<{ from: number; to: number; role: CurriculumRole }>;
}

export interface CatalogTrack {
  subject: string;
  slug: string;
  name_en: string;
  name_vi: string;
  grades: number[];
}

export interface CurriculumCatalog {
  version: {
    code: string;
    name_vi: string;
    issued_by: string;
    effective_from: string;
    source_ref: Record<string, string>;
  };
  subjects: CatalogSubject[];
  tracks: CatalogTrack[];
  legacy: { rename: Record<string, string>; remove: string[] };
}

export interface CatalogRow {
  slug: string;
  grade: number;
  role: CurriculumRole;
  sort_order: number;
}

const CATALOG_URL = new URL('../../../supabase/catalog/gdpt2018.json', import.meta.url);

export function loadCatalog(): CurriculumCatalog {
  return JSON.parse(readFileSync(CATALOG_URL, 'utf8')) as CurriculumCatalog;
}

export function expandCatalog(catalog: CurriculumCatalog): CatalogRow[] {
  return catalog.subjects.flatMap((subject, index) =>
    subject.grades.flatMap((range) =>
      Array.from({ length: range.to - range.from + 1 }, (_, offset) => ({
        slug: subject.slug,
        grade: range.from + offset,
        role: range.role,
        sort_order: index,
      })),
    ),
  );
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function contrastWithWhite(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const luminance = 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  return 1.05 / (luminance + 0.05);
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX = /^#[0-9a-f]{6}$/i;

export function validateCatalog(catalog: CurriculumCatalog): string[] {
  const errors: string[] = [];
  const slugs = new Set<string>();

  for (const s of catalog.subjects) {
    if (!SLUG.test(s.slug)) errors.push(`${s.slug}: invalid slug`);
    if (slugs.has(s.slug)) errors.push(`${s.slug}: duplicate subject`);
    slugs.add(s.slug);
    for (const field of ['name_en', 'name_vi', 'icon'] as const) {
      if (!s[field]?.trim()) errors.push(`${s.slug}: missing ${field}`);
    }
    if (!HEX.test(s.accent_color)) errors.push(`${s.slug}: accent_color must be #rrggbb`);
    if (s.grades.length === 0) errors.push(`${s.slug}: no grades`);

    const seen = new Set<number>();
    for (const range of s.grades) {
      if (!CURRICULUM_ROLES.includes(range.role)) errors.push(`${s.slug}: invalid role ${String(range.role)}`);
      if (!(Number.isInteger(range.from) && Number.isInteger(range.to) && range.from >= 1 && range.to <= 12 && range.from <= range.to)) {
        errors.push(`${s.slug}: invalid range ${range.from}-${range.to}`);
        continue;
      }
      for (let g = range.from; g <= range.to; g += 1) {
        if (seen.has(g)) errors.push(`${s.slug}: grade ${g} ranges overlap`);
        seen.add(g);
      }
    }
  }

  for (const t of catalog.tracks) {
    const subject = catalog.subjects.find((s) => s.slug === t.subject);
    if (!subject) {
      errors.push(`track ${t.slug}: unknown subject ${t.subject}`);
      continue;
    }
    if (!SLUG.test(t.slug)) errors.push(`track ${t.slug}: invalid slug`);
    const subjectGrades = new Set(expandCatalog({ ...catalog, subjects: [subject] }).map((r) => r.grade));
    for (const g of t.grades) {
      if (!subjectGrades.has(g)) errors.push(`track ${t.subject}/${t.slug}: grade ${g} not in subject catalog`);
    }
  }

  for (const [from, to] of Object.entries(catalog.legacy.rename)) {
    if (!slugs.has(to)) errors.push(`legacy rename ${from}: target ${to} is not a catalog subject`);
  }
  for (const slug of catalog.legacy.remove) {
    if (slugs.has(slug)) errors.push(`legacy remove ${slug}: still a catalog subject`);
  }

  return errors;
}
