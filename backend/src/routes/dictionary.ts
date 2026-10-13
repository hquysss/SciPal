import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { isSubjectArchived } from '../subjects/archived.js';
import { resolveTutorSettings } from '../tutor/settings.js';
import { tokensUsed } from '../tutor/tokens.js';
import { holdTutorTokens } from '../tutor/quotaHold.js';
import {
  DICTIONARY_HOLD_TOKENS,
  dictionaryMessage,
  dictionarySystemPrompt,
  normalizeLookup,
  parseDictionaryReply,
} from '../dictionary/lookup.js';

// Quick lookup in a lesson (docs/superpowers/specs/2026-10-13-quick-dictionary-design.md): a
// glossary term of the lesson's subject, else an entry kept for that subject, else — for a signed-in
// learner — one question to the AI Professor, kept for everyone and paid from the learner's tokens.

interface LookupUser {
  id?: string;
  app_metadata?: { app_role?: string };
}

const msg = (error: string, error_en: string) => ({ error, error_en });
const Body = z.object({ text: z.string().min(1).max(200), lesson_id: z.string().uuid() });
const TERM_COLUMNS =
  'id, kind, term_en, term_vi, part_of_speech, definition_en, definition_vi, example_en, example_vi, audio_url, image_url, image_alt_en, image_alt_vi, image_credit, ipa';
const ENTRY_COLUMNS = 'id, term_en, term_vi, ipa, part_of_speech, definition_en, definition_vi, example_en, example_vi';
const unavailable = msg('Dịch vụ chưa sẵn sàng.', 'The service is not available.');
const failed = msg('Chưa tra được từ này. Thử lại sau nhé.', 'Could not look this up. Please try again later.');
const notFound = msg('Không tìm thấy từ này.', 'No entry for this word.');

const one = <T,>(value: T | T[] | null | undefined): T | undefined => (Array.isArray(value) ? value[0] : value ?? undefined);

/** A dictionary entry in the shape a lesson term card reads. */
const asTerm = (entry: Record<string, unknown>) => ({
  kind: 'word',
  audio_url: null,
  image_url: null,
  image_alt_en: null,
  image_alt_vi: null,
  image_credit: null,
  ...entry,
});

export const dictionaryRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/dictionary/lookup', { bodyLimit: 2_048 }, async (request, reply) => {
    const parsed = Body.safeParse(request.body);
    const lookup = parsed.success ? normalizeLookup(parsed.data.text) : null;
    if (!parsed.success || !lookup) return reply.code(400).send(msg('Chọn 1 đến 5 từ để tra.', 'Select 1 to 5 words to look up.'));
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const { query, lang } = lookup;

    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, subject_id, subjects(name_en, archived_at)')
      .eq('id', parsed.data.lesson_id)
      .eq('status', 'published')
      .maybeSingle();
    if (lessonError) {
      request.log.error({ err: lessonError }, 'Dictionary lesson read failed');
      return reply.code(500).send(failed);
    }
    const subject = one((lesson as { subjects?: unknown } | null)?.subjects as { name_en?: string; archived_at?: string | null } | null);
    if (!lesson || isSubjectArchived(subject)) return reply.code(404).send(msg('Không tìm thấy bài học.', 'Lesson not found.'));
    const subjectId = (lesson as { subject_id: string }).subject_id;

    const { data: terms, error: termError } = await supabase
      .from('terms')
      .select(TERM_COLUMNS)
      .eq('subject_id', subjectId)
      .eq('status', 'published')
      .ilike(lang === 'en' ? 'term_en' : 'term_vi', query)
      .limit(1);
    if (termError) {
      request.log.error({ err: termError }, 'Dictionary glossary read failed');
      return reply.code(500).send(failed);
    }
    const term = ((terms ?? []) as unknown[])[0];
    if (term) return reply.send({ source: 'glossary', term });

    const kept = () =>
      supabase.from('dictionary_entries').select(ENTRY_COLUMNS).eq('subject_id', subjectId).eq('source_lang', lang).eq('query', query).maybeSingle();
    const { data: entry, error: entryError } = await kept();
    if (entryError) {
      request.log.error({ err: entryError }, 'Dictionary entry read failed');
      return reply.code(500).send(failed);
    }
    if (entry) return reply.send({ source: 'dictionary', term: asTerm(entry as Record<string, unknown>) });

    const user = (request as typeof request & { user?: LookupUser }).user;
    if (!user?.id) return reply.code(401).send(msg('Đăng nhập để tra từ mới.', 'Sign in to look up new words.'));
    const held = await holdTutorTokens(supabase, { ...user, id: user.id }, DICTIONARY_HOLD_TOKENS, request.log);
    if (!held.ok) return reply.code(held.status).send(held.body);
    const { hold } = held;

    const system = dictionarySystemPrompt();
    const content = dictionaryMessage({ query, lang, subject: subject?.name_en ?? '' });
    const settings = app.tutorSettings ? await app.tutorSettings.get() : resolveTutorSettings(null, process.env);
    let text = '';
    let reported: number | undefined;
    try {
      for await (const chunk of app.aiProvider.chat([{ role: 'user', content }], system, { provider: settings.provider, model: settings.model, effort: settings.reasoningEffort }, (u) => {
        reported = u.total;
      })) {
        text += chunk;
      }
    } catch (err) {
      request.log.error({ err }, 'Dictionary provider failed');
      text = '';
    }
    const result = text ? parseDictionaryReply(text) : null;
    if (!result) {
      await hold.settle('release');
      return reply.code(502).send(failed);
    }
    const used = tokensUsed(reported, system + content, text);
    if (result === 'not_a_word') {
      await hold.settle('commit', used);
      return reply.code(404).send(notFound);
    }

    // Two learners may ask at once: the second insert is skipped and reads the first one's entry.
    const { data: inserted, error: insertError } = await supabase
      .from('dictionary_entries')
      .upsert({ subject_id: subjectId, source_lang: lang, query, ...result, created_by: user.id }, { onConflict: 'subject_id,source_lang,query', ignoreDuplicates: true })
      .select(ENTRY_COLUMNS);
    let row: Record<string, unknown> | undefined = ((inserted ?? []) as Array<Record<string, unknown>>)[0];
    if (!insertError && !row) row = ((await kept()).data ?? undefined) as Record<string, unknown> | undefined;
    await hold.settle('commit', used);
    if (insertError || !row) {
      request.log.error({ err: insertError }, 'Dictionary entry save failed');
      return reply.code(500).send(failed);
    }
    return reply.send({ source: 'dictionary', term: asTerm(row), remaining: hold.remainingAfter(used) });
  });
};
