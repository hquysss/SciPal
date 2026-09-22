export const SCIPAL_GREEN = '#16a34a'; // brand color — never changes

export interface SubjectToken {
  accentColor: string;
  icon:        string;
  nameEn:      string;
  nameVi:      string;
}

export const SUBJECT_TOKENS: Record<string, SubjectToken> = {
  informatics: { accentColor: '#16a34a', icon: '</>', nameEn: 'Informatics', nameVi: 'Tin học'  },
  math:        { accentColor: '#2563eb', icon: '∑',   nameEn: 'Mathematics', nameVi: 'Toán'     },
  physics:     { accentColor: '#7c3aed', icon: '⚛',   nameEn: 'Physics',     nameVi: 'Vật lí'   },
  chemistry:   { accentColor: '#0d9488', icon: '⚗',   nameEn: 'Chemistry',   nameVi: 'Hoá học'  },
  biology:     { accentColor: '#65a30d', icon: '❁',   nameEn: 'Biology',     nameVi: 'Sinh học' },
};

export function getAccentColor(slug: string): string {
  return SUBJECT_TOKENS[slug]?.accentColor ?? SCIPAL_GREEN;
}
