'use client';
import type React from 'react';
import { createContext, useContext, type ReactNode } from 'react';
import { getAccentColor, SUBJECT_TOKENS, type SubjectToken } from './tokens';

interface SubjectContextValue {
  slug:        string;
  token:       SubjectToken | undefined;
  accentColor: string;
}

const SubjectContext = createContext<SubjectContextValue>({
  slug:        '',
  token:       undefined,
  accentColor: getAccentColor(''),
});

interface SubjectProviderProps {
  slug:        string;
  accentColor?: string;
  children:    ReactNode;
}

/**
 * Wrap a subject-scoped section in this provider.
 * It sets --accent on the container element so all themed
 * children pick up the right color without touching :root.
 */
export function SubjectProvider({ slug, accentColor: catalogAccent, children }: SubjectProviderProps) {
  const accentColor = catalogAccent && /^#[0-9a-f]{6}$/i.test(catalogAccent)
    ? catalogAccent
    : getAccentColor(slug);
  const token       = SUBJECT_TOKENS[slug];

  return (
    <SubjectContext.Provider value={{ slug, token, accentColor }}>
      <div style={{ '--accent': accentColor } as React.CSSProperties}>
        {children}
      </div>
    </SubjectContext.Provider>
  );
}

export function useSubject(): SubjectContextValue {
  return useContext(SubjectContext);
}

export function useAccent(): string {
  return useSubject().accentColor;
}
