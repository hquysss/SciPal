// The tutor's instructions: a private tutor in a session, not an answer engine. Lesson context
// carries only readable lesson text; quiz blocks and question data (answers, answer keys) never
// reach the model (invariant 4).

import { TUTOR_EXAMPLES } from './examples.js';

export type EducationLevel = 'primary' | 'lower_secondary' | 'upper_secondary';

/** How the tutor calls itself in Vietnamese. */
export const TUTOR_SELF = 'thầy';

const LESSON_CONTEXT_MAX = 6000;
const FENCE = '`'.repeat(3);

const LEVEL_TEXT: Record<EducationLevel, string> = {
  primary: 'a primary school pupil (grades 1–5): short sentences, everyday words, concrete examples from daily life',
  lower_secondary: 'a lower secondary student (grades 6–9): plain language, introduce each term with a simple example',
  upper_secondary: 'an upper secondary student (grades 10–12): precise terms and complete reasoning',
};

type Block = { type?: unknown; content?: { vi?: unknown; en?: unknown }; tabs?: Array<{ lang?: unknown; code?: unknown }>; katex?: unknown };

export function lessonContext(
  lesson: { title_vi: string; title_en: string; subject_name: string; blocks: unknown[] },
  language: 'vi' | 'en',
): string {
  const parts = [`${lesson.subject_name} — ${language === 'vi' ? lesson.title_vi : lesson.title_en}`];
  for (const raw of lesson.blocks) {
    const block = (raw ?? {}) as Block;
    if (block.type === 'theory') {
      const text = language === 'vi' ? block.content?.vi : block.content?.en;
      if (typeof text === 'string' && text.trim()) parts.push(text.trim());
    } else if (block.type === 'code') {
      for (const tab of block.tabs ?? []) {
        if (typeof tab.code === 'string') parts.push(`${FENCE}${String(tab.lang ?? '')}\n${tab.code}\n${FENCE}`);
      }
    } else if (block.type === 'formula' && typeof block.katex === 'string') {
      parts.push(`$$${block.katex}$$`);
    }
  }
  return parts.join('\n\n').slice(0, LESSON_CONTEXT_MAX);
}

export function buildSystemPrompt(opts: { language: 'vi' | 'en'; level: EducationLevel | null; lesson?: string }): string {
  const voice =
    opts.language === 'vi'
      ? `Always answer in Vietnamese. Call yourself "${TUTOR_SELF}" and the student "em", like a Vietnamese private tutor.`
      : 'Always answer in English. Speak as "I" to the student as "you".';
  const lines = [
    'You are the SciPal tutor for Vietnamese students following the GDPT 2018 curriculum.',
    `You are talking with ${LEVEL_TEXT[opts.level ?? 'upper_secondary']}.`,
    voice,
    '',
    'Behave like a private tutor in a session, not an answer engine:',
    '1. Find where the student is before teaching. If the question is vague, ask one question: which exercise, how far they got, where they are stuck.',
    '2. When the student is wrong, name the misconception behind it instead of only saying it is wrong.',
    '3. One move per turn: give a single hint or ask a single question, then stop and wait for the student. Ask at most one question per reply.',
    '4. Hints escalate: first a direction, then a specific hint, then one worked step. If the student asks for the solution twice, give it with each step explained.',
    '5. Close the loop: when the student gets it right, praise the specific thing they did well and ask one short check question.',
    '',
    'Tone: warm and encouraging, no empty praise, no filler. Usually 3–6 sentences; longer only when the student asks.',
    'The student can only type text: never ask for a photo, image or file; ask them to type the exercise or the part they are stuck on.',
    'Only help with school learning. Refuse unsafe or unrelated requests briefly and kindly, and steer back to the lesson.',
    'Format with markdown. Write formulas as $...$ or $$...$$ and code in fenced blocks with a language.',
    '',
    'Example exchanges (copy the voice and rhythm, not the content):',
    TUTOR_EXAMPLES[opts.language],
  ];
  if (opts.lesson) lines.push('', 'Lesson context (what the student is studying):', opts.lesson);
  return lines.join('\n');
}
