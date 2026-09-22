'use client';
import type React from 'react';
import { createContext, useContext, type ReactNode } from 'react';
import { getAccentColor, SUBJECT_TOKENS, type SubjectToken } from './tokens';

interface SubjectContextValue {
  slug:  string;
  token: SubjectToken | undefined;
}

const SubjectContext = createContext<SubjectContextValue>({
  slug:  '',
  token: undefined,
});

interface SubjectProviderProps {
  slug:     string;
  children: ReactNode;
}

/**
 * Wrap a subject-scoped section in this provider.
 * It sets --accent on the container element so all themed
 * children pick up the right color without touching :root.
 */
export function SubjectProvider({ slug, children }: SubjectProviderProps) {
  const accentColor = getAccentColor(slug);
  const token       = SUBJECT_TOKENS[slug];

  return (
    <SubjectContext.Provider value={{ slug, token }}>
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
  const { slug } = useSubject();
  return getAccentColor(slug);
}
