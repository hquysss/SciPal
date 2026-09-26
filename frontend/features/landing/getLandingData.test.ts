import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createServerClient } from '@scipal/supabase';
import { SUBJECT_CONFIG } from '../../lib/subject-config';
import {
  classifyInformatics,
  getLandingData,
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
  limit: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
};

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

function createQueryChain(result: QueryResult, terminal: 'order' | 'maybeSingle'): QueryChain {
  const chain = {} as QueryChain;
  let orderCount = 0;
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.order = vi.fn(() => {
    orderCount += 1;
    if (terminal === 'order' && orderCount === 2) return Promise.resolve(result);
    return chain;
  });
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

function setupSupabase(subjectResult: QueryResult, lessonResult: QueryResult) {
  const subjects = createQueryChain(subjectResult, 'order');
  const lessons = createQueryChain(lessonResult, 'maybeSingle');
  const client = {
    from: vi.fn((table: string) => table === 'subjects' ? subjects : lessons),
  };
  supabaseMocks.createServerClient.mockReturnValue(
    client as unknown as ReturnType<typeof createServerClient>,
  );
  return { client, subjects, lessons };
}

const informaticsSubject: LandingSubject = {
  id: 'subject-informatics',
  slug: 'informatics',
  name_en: 'Informatics',
  name_vi: 'Tin học',
  icon: '</>',
  accent_color: '#16845B',
  status: 'active',
  sort_order: 1,
  education_level: 'upper_secondary',
};

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
    const { client, subjects, lessons } = setupSupabase(
      { data: [informaticsSubject], error: null },
      { data: publishedLesson, error: null },
    );

    const result = await getLandingData({ get: () => undefined });

    expect(result).toEqual({
      catalog: { kind: 'ready', subjects: [informaticsSubject] },
      informatics: { kind: 'available', lesson: publishedLesson },
    });
    expect(client.from).toHaveBeenNthCalledWith(1, 'subjects');
    expect(subjects.select).toHaveBeenCalledWith(
      'id,slug,name_en,name_vi,icon,accent_color,status,sort_order,education_level',
    );
    expect(subjects.order).toHaveBeenNthCalledWith(1, 'education_level', { ascending: true });
    expect(subjects.order).toHaveBeenNthCalledWith(2, 'sort_order', { ascending: true });
    expect(lessons.select).toHaveBeenCalledWith('slug,title_en,title_vi');
    expect(lessons.eq).toHaveBeenNthCalledWith(1, 'subject_id', informaticsSubject.id);
    expect(lessons.eq).toHaveBeenNthCalledWith(2, 'published', true);
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
      { data: [informaticsSubject], error: null },
      { data: null, error: { message: 'lesson query failed' } },
    );

    await expect(getLandingData({ get: () => undefined })).resolves.toEqual({
      catalog: { kind: 'ready', subjects: [informaticsSubject] },
      informatics: { kind: 'error' },
    });
  });
});
