import { describe, it, expect, beforeEach } from 'vitest';
import { createBrowserClient, createServerClient } from '../client';
import type { Tables, TablesInsert, TablesUpdate } from '../types';

describe('Supabase Client Package', () => {
  const dummyUrl = 'https://example.supabase.co';
  const dummyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy-anon-key';

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = dummyUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = dummyKey;
  });

  describe('createBrowserClient', () => {
    it('initializes browser client with default env values', () => {
      const client = createBrowserClient();
      expect(client).toBeDefined();
      expect(typeof client.from).toBe('function');
      expect(typeof client.auth.getSession).toBe('function');
    });

    it('initializes browser client with explicit url and key', () => {
      const client = createBrowserClient('https://custom.supabase.co', 'custom-key');
      expect(client).toBeDefined();
      expect(typeof client.from).toBe('function');
    });

    it('fails clearly when project url and key are missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      expect(() => createBrowserClient()).toThrow(/URL and API key are required/);
    });
  });

  describe('createServerClient', () => {
    it('initializes server client with legacy get() cookie store', () => {
      const cookieMap = new Map<string, string>([['sb-test-auth-token', 'test-token']]);
      const cookieStore = {
        get: (name: string) => {
          const val = cookieMap.get(name);
          return val ? { value: val } : undefined;
        },
      };

      const client = createServerClient(cookieStore);
      expect(client).toBeDefined();
      expect(typeof client.from).toBe('function');
      expect(typeof client.auth.getUser).toBe('function');
    });

    it('initializes server client with modern getAll() / setAll() cookie store', () => {
      const cookies = [{ name: 'sb-test-token', value: 'token-xyz' }];
      const cookieStore = {
        getAll: () => cookies,
        setAll: () => {},
      };

      const client = createServerClient(cookieStore);
      expect(client).toBeDefined();
      expect(typeof client.from).toBe('function');
      expect(typeof client.auth.getUser).toBe('function');
    });

    it('fails clearly when project url and key are missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const cookieStore = {
        get: () => undefined,
      };
      expect(() => createServerClient(cookieStore)).toThrow(/URL and Key are required/);
    });
  });

  describe('Database Type Contract', () => {
    it('allows valid type assignments for public tables', () => {
      type SubjectRow = Tables<'subjects'>;
      type SubjectInsert = TablesInsert<'subjects'>;
      type SubjectUpdate = TablesUpdate<'subjects'>;
      type ProfileUpdate = TablesUpdate<'profiles'>;

      const subjectRow: SubjectRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        slug: 'informatics',
        name_en: 'Informatics',
        name_vi: 'Tin học',
        accent_color: '#16a34a',
        icon: '</>',
        icon_url: null,
        sort_order: 0,
        created_at: '2026-09-22T00:00:00Z',
      };

      const subjectInsert: SubjectInsert = {
        slug: 'math',
        name_en: 'Mathematics',
        name_vi: 'Toán',
        accent_color: '#2563eb',
        icon: '∑',
      };

      const subjectUpdate: SubjectUpdate = {
        icon_url: 'https://example.com/math.svg',
      };
      const profileUpdate: ProfileUpdate = {
        preferred_education_level: 'primary',
      };

      expect(subjectRow.slug).toBe('informatics');
      expect(subjectInsert.slug).toBe('math');
      expect(subjectUpdate.icon_url).toBe('https://example.com/math.svg');
      expect(profileUpdate.preferred_education_level).toBe('primary');
    });

    it('allows valid Lesson row with typed blocks', () => {
      type LessonRow = Tables<'lessons'>;

      const lesson: LessonRow = {
        id: 'lesson-uuid',
        topic_id: 'topic-uuid',
        subject_id: 'subject-uuid',
        slug: 'intro-python',
        title_en: 'Introduction to Python',
        title_vi: 'Giới thiệu Python',
        grade: 11,
        blocks: [
          {
            type: 'theory',
            content: {
              en: 'Welcome to Python',
              vi: 'Chào mừng đến với Python',
            },
          },
        ],
        sort_order: 1,
        created_by: null,
        status: 'published',
        track_id: null,
        digital_competency: null,
        review_note: null,
        published_at: '2026-09-22T00:00:00Z',
        reviewed_by: null,
        reviewed_at: null,
        created_at: '2026-09-22T00:00:00Z',
        updated_at: '2026-09-22T00:00:00Z',
      };

      expect(lesson.blocks).toHaveLength(1);
      expect(lesson.blocks[0]?.type).toBe('theory');
    });
  });
});
