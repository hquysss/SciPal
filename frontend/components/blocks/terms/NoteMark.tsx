'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { TheoryBlock } from '@scipal/types';
import type { LessonTerm } from './LessonTermsContext';
import { TermMark } from './TermMark';

type Notes = NonNullable<TheoryBlock['notes']>;

/** The notes of the theory block being drawn, and the language it is drawn in. */
export const NotesContext = createContext<{ notes: TheoryBlock['notes']; lang: 'en' | 'vi' }>({ notes: undefined, lang: 'vi' });

/** A note as the popover card reads it. The English side falls back to the Vietnamese one, never to nothing. */
export function noteAsTerm(key: string, note: Notes[string]): LessonTerm {
  return {
    id: `note-${key}`,
    kind: 'word',
    term_vi: note.term.vi,
    term_en: note.term.en.trim() || note.term.vi,
    part_of_speech: null,
    definition_vi: note.definition.vi,
    definition_en: note.definition.en.trim() || note.definition.vi,
    example_en: null,
    example_vi: null,
    audio_url: null,
    image_url: note.image?.url ?? null,
    image_alt_vi: note.image?.alt.vi ?? null,
    image_alt_en: note.image?.alt.en.trim() || note.image?.alt.vi || null,
    image_credit: null,
  };
}

/** Words the teacher gave their own popover (`{note:key:words}`); with no matching note they read as plain text. */
export function NoteMark({ noteKey, children }: { noteKey: string; children: ReactNode }) {
  const { notes, lang } = useContext(NotesContext);
  const note = notes?.[noteKey];
  if (!note) return <>{children}</>;
  return (
    <TermMark termId={`note-${noteKey}`} note={{ term: noteAsTerm(noteKey, note), lang }}>
      {children}
    </TermMark>
  );
}
