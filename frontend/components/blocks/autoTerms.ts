import type { Block } from '@scipal/types';
import { TERM_ID } from './remarkTerm';

// Glossary terms of the lesson's subject, tagged for the learner without the teacher doing it:
// the first use of each term in a lesson's theory text becomes `{term:<id>:<words>}`, which the
// renderer already turns into a popover. A teacher's own tags are kept and count as that term's first use.

export type TermIndexEntry = { id: string; term_en: string; term_vi: string };

/**
 * A term shorter than this is too likely to be an everyday word ("if", "số"), unless it has several words
 * or is an acronym ("SQL", "C++"), which is matched in the case it is written.
 */
const MIN_LETTERS = 4;

/** Where a tag is not a tag: code, formulas, links, HTML, headings, table rows, and the tags already there. */
const PROTECTED = new RegExp(
  [
    '```[\\s\\S]*?(?:```|(?![\\s\\S]))',
    '~~~[\\s\\S]*?(?:~~~|(?![\\s\\S]))',
    '`[^`\\n]*`',
    '\\$\\$[\\s\\S]*?\\$\\$',
    '\\$[^$\\n]*\\$',
    '\\{(?:term|note):[^{}\\n]+\\}',
    '!?\\[[^\\]\\n]*\\]\\([^)\\n]*\\)',
    'https?://\\S+',
    '<[^>\\n]+>',
    '^[ \\t]{0,3}#{1,6}[ \\t][^\\n]*$',
    '^[^\\n]*\\|[^\\n]*$',
  ].join('|'),
  'gm',
);
const EXISTING = /^\{term:([0-9a-f-]{36}):/i;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const letters = (s: string) => (s.match(/\p{L}/gu) ?? []).length;

type Matcher = { regex: RegExp; ids: Map<string, { id: string; exact: string | null }> };
const matchers = new WeakMap<TermIndexEntry[], Partial<Record<'en' | 'vi', Matcher | null>>>();

function matcherOf(entries: TermIndexEntry[], lang: 'en' | 'vi'): Matcher | null {
  const cached = matchers.get(entries) ?? {};
  if (cached[lang] !== undefined) return cached[lang]!;
  const ids = new Map<string, { id: string; exact: string | null }>();
  for (const entry of entries) {
    const written = (lang === 'en' ? entry.term_en : entry.term_vi).trim();
    const word = written.toLowerCase();
    if (!word || !TERM_ID.test(entry.id)) continue;
    const short = letters(word) < MIN_LETTERS && !word.includes(' ');
    // Two capitals ("SQL") or a symbol ("C++"); a lone capital is just a sentence-case word.
    const acronym = /\p{Lu}.*\p{Lu}/u.test(written) || /[^\p{L}\p{N}\s'-]/u.test(written);
    if (short && !acronym) continue;
    if (!ids.has(word)) ids.set(word, { id: entry.id.toLowerCase(), exact: short ? written : null });
  }
  // Longest first, so "for loop" is read before "loop"; English terms may take a plural ending.
  const alternatives = [...ids.keys()].sort((a, b) => b.length - a.length).map((w) => escape(w) + (lang === 'en' ? '(?:e?s)?' : ''));
  const matcher = alternatives.length
    ? { regex: new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives.join('|')})(?![\\p{L}\\p{N}])`, 'giu'), ids }
    : null;
  matchers.set(entries, { ...cached, [lang]: matcher });
  return matcher;
}

/** The text with the first use of each not-yet-`seen` term tagged. `seen` is updated, so it can run across blocks. */
export function autoTagText(text: string, entries: TermIndexEntry[], lang: 'en' | 'vi', seen: Set<string>): string {
  const matcher = matcherOf(entries, lang);
  if (!matcher) return text;
  const lookup = (found: string) => {
    const lower = found.toLowerCase();
    // A plural: drop its ending to find the term.
    const hit = matcher.ids.get(lower) ?? matcher.ids.get(lower.replace(/es$/, '')) ?? matcher.ids.get(lower.replace(/s$/, ''));
    return hit && (hit.exact === null || found === hit.exact) ? hit.id : undefined;
  };
  const tagPlain = (plain: string) =>
    plain.replace(matcher.regex, (found) => {
      const id = lookup(found);
      if (!id || seen.has(id)) return found;
      seen.add(id);
      return `{term:${id}:${found}}`;
    });
  let out = '';
  let last = 0;
  for (const match of text.matchAll(PROTECTED)) {
    out += tagPlain(text.slice(last, match.index));
    out += match[0];
    const own = EXISTING.exec(match[0]);
    if (own && TERM_ID.test(own[1]!)) seen.add(own[1]!.toLowerCase());
    last = match.index + match[0].length;
  }
  return out + tagPlain(text.slice(last));
}

/**
 * The lesson's theory blocks with its subject's terms tagged: once per term through the lesson, in each
 * language by that language's term. Other blocks, and the same array when nothing changes, come back as they were.
 */
export function autoTagBlocks(blocks: Block[], entries: TermIndexEntry[]): Block[] {
  if (entries.length === 0) return blocks;
  const seen = { en: new Set<string>(), vi: new Set<string>() };
  let changed = false;
  const out = blocks.map((block) => {
    if (block.type !== 'theory') return block;
    const content = {
      en: autoTagText(block.content.en ?? '', entries, 'en', seen.en),
      vi: autoTagText(block.content.vi ?? '', entries, 'vi', seen.vi),
    };
    if (content.en === block.content.en && content.vi === block.content.vi) return block;
    changed = true;
    return { ...block, content };
  });
  return changed ? out : blocks;
}
