import type { Block } from '@scipal/types';

// `{note:<key>:chữ}` is the same with a popover the teacher wrote in the block (block.notes).
// `{term:<uuid>:chữ}` tags a glossary term in lesson text: the words stay as written and become a
// TermMark (popover) in TheoryRenderer, and the lesson lists every tagged term at its end. `:` and
// not `|` separates the parts, because GFM splits table cells on `|` before reading inline text.

export const TERM_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const pattern = () => /\{(?:term:([0-9a-f-]{36})|note:([a-z0-9]{4,12})):([^{}\n]+)\}/gi;

type MdNode = { type: string; value?: string; children?: MdNode[]; data?: Record<string, unknown> };

function split(value: string): MdNode[] | null {
  const out: MdNode[] = [];
  let last = 0;
  for (const match of value.matchAll(pattern())) {
    if (match[1] && !TERM_ID.test(match[1])) continue;
    if (match.index > last) out.push({ type: 'text', value: value.slice(last, match.index) });
    out.push({
      type: 'termTag',
      data: { hName: 'span', hProperties: match[1] ? { 'data-term-id': match[1].toLowerCase() } : { 'data-note-id': match[2] } },
      children: [{ type: 'text', value: match[3] }],
    });
    last = match.index + match[0].length;
  }
  if (out.length === 0) return null;
  if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
  return out;
}

function walk(node: MdNode) {
  if (!node.children) return;
  const next: MdNode[] = [];
  for (const child of node.children) {
    const parts = child.type === 'text' && child.value ? split(child.value) : null;
    if (parts) next.push(...parts);
    else {
      walk(child);
      next.push(child);
    }
  }
  node.children = next;
}

/** Text nodes only, so a tag inside code or a formula stays as typed. */
export function remarkTerm() {
  return (tree: MdNode) => walk(tree);
}

/** Fenced code, inline code and `$…$` / `$$…$$` formulas, where a tag is not a tag. */
const LITERAL = /```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]*`|\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g;

/** The tagged term ids in Markdown text, each once, in order of first appearance. */
export function termIdsOf(text: string): string[] {
  const ids = new Set<string>();
  for (const match of text.replace(LITERAL, ' ').matchAll(pattern())) {
    if (match[1] && TERM_ID.test(match[1])) ids.add(match[1].toLowerCase());
  }
  return [...ids];
}

/** The block's own popovers (`{note:key:…}`) used in one language, as [block, key] in order of appearance. */
export function noteKeysOfBlocks(blocks: Block[], lang: 'en' | 'vi'): Array<{ block: Extract<Block, { type: 'theory' }>; key: string }> {
  const out: Array<{ block: Extract<Block, { type: 'theory' }>; key: string }> = [];
  for (const block of blocks) {
    if (block.type !== 'theory' || !block.notes) continue;
    const seen = new Set<string>();
    for (const m of (block.content[lang] ?? '').replace(LITERAL, ' ').matchAll(pattern())) {
      if (m[2] && block.notes[m[2]] && !seen.has(m[2])) {
        seen.add(m[2]);
        out.push({ block, key: m[2] });
      }
    }
  }
  return out;
}

/** The tagged term ids of a lesson's theory blocks in one language. */
export function termIdsOfBlocks(blocks: Block[], lang: 'en' | 'vi'): string[] {
  const ids = new Set<string>();
  for (const block of blocks) if (block.type === 'theory') for (const id of termIdsOf(block.content[lang] ?? '')) ids.add(id);
  return [...ids];
}
