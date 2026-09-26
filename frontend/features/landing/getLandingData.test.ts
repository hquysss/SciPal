import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createServerClient } from '@scipal/supabase';
import { SUBJECT_CONFIG } from '../../lib/subject-config';
import {
  classifyInformatics,
  expandSubjectsByLevel,
  getLandingData,
  levelOfGrade,
  type LandingLesson,
  type LandingSubject,
} from './getLandingData';

const supabaseMocks = vi.hoisted(() => ({ createServerClient: vi.fn() }));

vi.mock('@scipal/supabase', () => ({
  createServerClient: supabaseMocks.createServerClient,
}));

type QueryChain = {
  select: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
};

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

function createQueryChain(result: QueryResult, terminal: 'order' | 'eq' | 'maybeSingle'): QueryChain {
  const chain = {} as QueryChain;
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => (terminal === 'eq' ? Promise.resolve(result) : chain));
  chain.gte = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.order = vi.fn(() => (terminal === 'order' ? Promise.resolve(result) : chain));
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

function setupSupabase(
  subjectResult: QueryResult,
  lessonResult: QueryResult,
  publishedResult: QueryResult = { data: [{ subject_id: informaticsSubject.id, grade: 11 }], error: null },
) {
  const subjects = createQueryChain(subjectResult, 'order');
  const published = createQueryChain(publishedResult, 'eq');
  const lessons = createQueryChain(lessonResult, 'maybeSingle');
  let lessonCalls = 0;
  const client = {
    from: vi.fn((table: string) => {
      if (table === 'subjects') return subjects;
      lessonCalls += 1;
      return lessonCalls === 1 ? published : lessons;
    }),
  };
  supabaseMocks.createServerClient.mockReturnValue(
    client as unknown as ReturnType<typeof createServerClient>,
  );
  return { client, subjects, published, lessons };
}

const informaticsSubject: LandingSubject = {
  id: 'subject-informatics',
  slug: 'informatics',
  name_en: 'Informatics',
  name_vi: 'Tin học',
  icon: '</>',
  icon_url: null,
  accent_color: '#16845B',
  status: 'active',
  sort_order: 1,
  education_level: 'upper_secondary',
};

const { status: _status, education_level: _level, ...informaticsFields } = informaticsSubject;
const informaticsRow = { ...informaticsFields, subject_grade_catalog: [{ grade: 11 }] };

const publishedLesson: LandingLesson = {
  slug: 'algorithms',
  title_en: 'Algorithms',
  title_vi: 'Thuật toán',
};

const noError = { message: '' };

describe('classifyInformatics', () => {
  it('offers an entry only for active Informatics with a published lesson and supported route', () => {
    expect(classifyInformatics(informaticsSubject, publishedLesson, false)).toEqual({
      kind: 'available',
      lesson: publishedLesson,
    });
  });

  it('keeps an active subject with no published lesson empty', () => {
    expect(classifyInformatics(informaticsSubject, null, false)).toEqual({ kind: 'empty' });
  });

  it('preserves query failures as errors', () => {
    expect(classifyInformatics(informaticsSubject, null, true)).toEqual({ kind: 'error' });
  });

  it('does not expose a CTA when the database or route marks Informatics unavailable', () => {
    expect(classifyInformatics({ ...informaticsSubject, status: 'upcoming' }, publishedLesson, false))
      .toEqual({ kind: 'empty' });

    const originalStatus = SUBJECT_CONFIG.informatics.status;
    SUBJECT_CONFIG.informatics.status = 'upcoming';
    try {
      expect(classifyInformatics(informaticsSubject, publishedLesson, false)).toEqual({ kind: 'empty' });
    } finally {
      SUBJECT_CONFIG.informatics.status = originalStatus;
    }
  });
});

describe('getLandingData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries only the public catalog and lesson preview fields in a stable order', async () => {
    const { client, subjects, published, lessons } = setupSupabase(
      { data: [informaticsRow], error: null },
      { data: publishedLesson, error: null },
    );

    const result = await getLandingData({ get: () => undefined });

    expect(result).toEqual({
      catalog: { kind: 'ready', subjects: [informaticsSubject] },
      informatics: { kind: 'available', lesson: publishedLesson },
    });
    expect(client.from).toHaveBeenNthCalledWith(1, 'subjects');
    expect(subjects.select).toHaveBeenCalledWith(
      'id,slug,name_en,name_vi,icon,icon_url,accent_color,sort_order,subject_grade_catalog!inner(grade)',
    );
    expect(subjects.eq).toHaveBeenCalledWith('subject_grade_catalog.active', true);
    expect(subjects.order).toHaveBeenCalledOnce();
    expect(subjects.order).toHaveBeenCalledWith('sort_order', { ascending: true });
    expect(published.select).toHaveBeenCalledWith('subject_id,grade');
    expect(published.eq).toHaveBeenCalledWith('status', 'published');
    expect(lessons.select).toHaveBeenCalledWith('slug,title_en,title_vi');
    expect(lessons.eq).toHaveBeenNthCalledWith(1, 'subject_id', informaticsSubject.id);
    expect(lessons.eq).toHaveBeenNthCalledWith(2, 'status', 'published');
    expect(lessons.gte).toHaveBeenCalledWith('grade', 10);
    expect(lessons.order).toHaveBeenCalledWith('sort_order', { ascending: true });
    expect(lessons.limit).toHaveBeenCalledWith(1);
    expect(lessons.maybeSingle).toHaveBeenCalledOnce();
  });

  it('keeps catalog and lesson query failures distinct from successful empty data', async () => {
    setupSupabase({ data: null, error: noError }, { data: null, error: noError });
    const failedCatalog = await getLandingData({ get: () => undefined });
    expect(failedCatalog).toEqual({
      catalog: { kind: 'error' },
      informatics: { kind: 'error' },
    });

    setupSupabase({ data: [], error: null }, { data: null, error: noError });
    const emptyCatalog = await getLandingData({ get: () => undefined });
    expect(emptyCatalog).toEqual({
      catalog: { kind: 'ready', subjects: [] },
      informatics: { kind: 'empty' },
    });
  });

  it('reports a lesson-read error without discarding the successful catalog', async () => {
    setupSupabase(
      { data: [informaticsRow], error: null },
      { data: null, error: { message: 'lesson query failed' } },
    );

    await expect(getLandingData({ get: () => undefined })).resolves.toEqual({
      catalog: { kind: 'ready', subjects: [informaticsSubject] },
      informatics: { kind: 'error' },
    });
  });
});

describe('getLandingData published-lesson read', () => {
  it('treats a failed published-lesson read as a catalog error', async () => {
    setupSupabase(
      { data: [informaticsRow], error: null },
      { data: publishedLesson, error: null },
      { data: null, error: { message: 'published lessons failed' } },
    );
    await expect(getLandingData({ get: () => undefined })).resolves.toEqual({
      catalog: { kind: 'error' },
      informatics: { kind: 'error' },
    });
  });
});

describe('expandSubjectsByLevel', () => {
  const base = { name_en: 'Mathematics', name_vi: 'Toán', icon: '∑', icon_url: null, accent_color: '#2563eb' };
  const math = { ...base, id: 'm', slug: 'math', sort_order: 2, subject_grade_catalog: [1, 2, 6, 10, 11].map((grade) => ({ grade })) };
  const informatics = {
    ...base, id: 'i', slug: 'informatics', name_en: 'Informatics', name_vi: 'Tin học', sort_order: 18,
    subject_grade_catalog: [6, 7, 11].map((grade) => ({ grade })),
  };

  it('maps grades to levels', () => {
    expect([1, 5, 6, 9, 10, 12].map(levelOfGrade)).toEqual([
      'primary', 'primary', 'lower_secondary', 'lower_secondary', 'upper_secondary', 'upper_secondary',
    ]);
  });

  it('emits one card per subject per level it belongs to', () => {
    const cards = expandSubjectsByLevel([math], []);
    expect(cards.map((c) => c.education_level)).toEqual(['primary', 'lower_secondary', 'upper_secondary']);
    expect(new Set(cards.map((c) => c.id)).size).toBe(1);
  });

  it('marks a subject active only at levels with a published lesson in their grades', () => {
    const cards = expandSubjectsByLevel([informatics], [{ subject_id: 'i', grade: 11 }]);
    expect(cards.find((c) => c.education_level === 'lower_secondary')?.status).toBe('upcoming');
    expect(cards.find((c) => c.education_level === 'upper_secondary')?.status).toBe('active');
  });

  it('ignores subjects without catalog rows', () => {
    expect(expandSubjectsByLevel([{ ...math, subject_grade_catalog: [] }], [])).toEqual([]);
  });
});
