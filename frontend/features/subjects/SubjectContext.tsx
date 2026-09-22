'use client';
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import type { SubjectConfig } from '@/lib/subject-config';

interface SubjectContextValue {
  subject: SubjectConfig | null;
}

const SubjectContext = createContext<SubjectContextValue>({ subject: null });

export function SubjectProvider({ subject, children }: { subject: SubjectConfig; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.setProperty('--accent', subject.accentColor);
    }
    return () => {
      // Reset on unmount (prevents accent bleed)
      if (ref.current) ref.current.style.removeProperty('--accent');
    };
  }, [subject.accentColor]);

  return (
    <SubjectContext.Provider value={{ subject }}>
      <div ref={ref}>{children}</div>
    </SubjectContext.Provider>
  );
}

export function useSubject() {
  return useContext(SubjectContext);
}
