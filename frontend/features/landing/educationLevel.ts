import type { EducationLevel } from '@scipal/supabase';
import { z } from 'zod';

export type { EducationLevel } from '@scipal/supabase';

const educationLevelSchema = z.enum(['primary', 'lower_secondary', 'upper_secondary']);

export const LEVEL_SESSION_KEY = 'scipal_education_level_tab';

type SessionStorageReader = Pick<Storage, 'getItem'>;
type SessionStorageWriter = Pick<Storage, 'setItem'>;

export function parseEducationLevel(value: unknown): EducationLevel | null {
  const parsed = educationLevelSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function resolveEducationLevel(
  accountLevel: EducationLevel | null,
  sessionLevel: EducationLevel | null,
): { level: EducationLevel | null; source: 'account' | 'session' | 'none' } {
  if (accountLevel !== null) return { level: accountLevel, source: 'account' };
  if (sessionLevel !== null) return { level: sessionLevel, source: 'session' };
  return { level: null, source: 'none' };
}

export function readSessionEducationLevel(storage: SessionStorageReader): EducationLevel | null {
  return parseEducationLevel(storage.getItem(LEVEL_SESSION_KEY));
}

export function writeSessionEducationLevel(
  storage: SessionStorageWriter,
  level: EducationLevel,
): void {
  storage.setItem(LEVEL_SESSION_KEY, level);
}
