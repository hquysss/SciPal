// AI lesson drafts for teachers (routes/authorAi.ts): the instructions to the model and how its
// answer is read back into theory blocks.

const MAX_SECTIONS = 8;
const MAX_SECTION_CHARS = 6000;

export type TheoryDraftBlock = { type: 'theory'; content: { vi: string; en: string } };

export function authorAiSystemPrompt(grade: number): string {
  return [
    `You help a Vietnamese teacher draft the theory part of a lesson for grade ${grade} of the GDPT 2018 curriculum.`,
    'Write clear, correct explanations with short examples, in the usual classroom terms of the subject.',
    'Write every section in both Vietnamese and English with the same content.',
    'Use Markdown: ## headings, lists, **bold**; formulas as $...$ or $$...$$; code in fenced blocks.',
    'Do not write exam questions, answer keys or exercises with solutions.',
    `Reply with only JSON: {"blocks":[{"vi":"...","en":"..."}]} with 1 to ${MAX_SECTIONS} sections.`,
  ].join('\n');
}

export function authorAiUserMessage(input: { topic: string; grade: number; language: 'vi' | 'en'; request: string }): string {
  return [
    `Topic: ${input.topic}`,
    `Grade: ${input.grade}`,
    `The teacher writes in: ${input.language === 'vi' ? 'Vietnamese' : 'English'}`,
    input.request ? `Teacher's request:\n${input.request}` : '',
  ].filter(Boolean).join('\n');
}

/** The model's answer as theory blocks, or null when it is not 1–8 bilingual sections. */
export function parseDraft(reply: string): TheoryDraftBlock[] | null {
  const start = reply.indexOf('{');
  const end = reply.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  let value: unknown;
  try {
    value = JSON.parse(reply.slice(start, end + 1));
  } catch {
    return null;
  }
  const blocks = (value as { blocks?: unknown } | null)?.blocks;
  if (!Array.isArray(blocks) || blocks.length === 0 || blocks.length > MAX_SECTIONS) return null;
  const out: TheoryDraftBlock[] = [];
  for (const b of blocks) {
    const vi = (b as { vi?: unknown })?.vi;
    const en = (b as { en?: unknown })?.en;
    if (typeof vi !== 'string' || typeof en !== 'string') return null;
    if (!vi.trim() || !en.trim() || vi.length > MAX_SECTION_CHARS || en.length > MAX_SECTION_CHARS) return null;
    out.push({ type: 'theory', content: { vi: vi.trim(), en: en.trim() } });
  }
  return out;
}
