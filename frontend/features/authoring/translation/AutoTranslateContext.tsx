'use client';

import { createContext, useContext, useState } from 'react';
import type { Mark } from './autoTranslate';
import type { Bilingual } from './bilingualFields';
import { TranslationMark } from './TranslationMark';

// Lets any block editor show the "Dịch tự động" label under an English field and translate it
// again, without threading marks through every block component.

export type AutoTranslateValue = {
  /** Translations filled in this editing session. */
  marks: Mark[];
  /** English for one Vietnamese text (remembered as a mark), or null when it failed. */
  retranslate: (vi: string) => Promise<string | null>;
  /** Remembers translations filled elsewhere (the practice question editor). */
  addMarks: (marks: Mark[]) => void;
};

export const AutoTranslateContext = createContext<AutoTranslateValue | null>(null);

/** Under an English field: its translation label, when the English came from automatic translation. */
export function AutoTranslatedNote({ text, onEnglish }: { text: Bilingual; onEnglish: (en: string) => void }) {
  const ctx = useContext(AutoTranslateContext);
  const [busy, setBusy] = useState(false);
  if (!ctx) return null;
  const mark = text.en ? ctx.marks.findLast((m) => m.en === text.en) : undefined;
  const again = async () => {
    setBusy(true);
    const en = await ctx.retranslate(text.vi);
    setBusy(false);
    if (en) onEnglish(en);
  };
  return <TranslationMark mark={mark} text={text} onRetranslate={() => void again()} busy={busy} />;
}
