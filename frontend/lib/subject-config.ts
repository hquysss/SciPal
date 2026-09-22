export type SubjectSlug = 'informatics' | 'math' | 'physics' | 'chemistry' | 'biology';

export interface SubjectConfig {
  slug: SubjectSlug;
  nameEn: string;
  nameVi: string;
  accentColor: string;
  icon: string;
  status: 'active' | 'upcoming';
}

export const SUBJECT_CONFIG: Record<SubjectSlug, SubjectConfig> = {
  informatics: {
    slug: 'informatics',
    nameEn: 'Informatics',
    nameVi: 'Tin học',
    accentColor: '#16a34a',
    icon: '</>',
    status: 'active',
  },
  math: {
    slug: 'math',
    nameEn: 'Mathematics',
    nameVi: 'Toán',
    accentColor: '#2563eb',
    icon: '∑',
    status: 'upcoming',
  },
  physics: {
    slug: 'physics',
    nameEn: 'Physics',
    nameVi: 'Vật lí',
    accentColor: '#7c3aed',
    icon: '⚛',
    status: 'upcoming',
  },
  chemistry: {
    slug: 'chemistry',
    nameEn: 'Chemistry',
    nameVi: 'Hoá học',
    accentColor: '#0d9488',
    icon: '⚗',
    status: 'upcoming',
  },
  biology: {
    slug: 'biology',
    nameEn: 'Biology',
    nameVi: 'Sinh học',
    accentColor: '#65a30d',
    icon: '❁',
    status: 'upcoming',
  },
};
