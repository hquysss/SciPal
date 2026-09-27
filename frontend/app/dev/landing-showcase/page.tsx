import { notFound } from 'next/navigation';
import { getAccentColor } from '@scipal/ui';
import { LandingPage } from '../../../features/landing/LandingPage';
import { parseEducationLevel } from '../../../features/landing/educationLevel';
import type { InformaticsAvailability, LandingSubject } from '../../../features/landing/getLandingData';
import type { EducationLevel } from '../../../features/landing/educationLevel';

type SearchParams = {
  catalog?: string;
  level?: string;
  status?: string;
  scope?: string;
};

const catalogs: Record<EducationLevel, LandingSubject[]> = {
  primary: [
    ['primary-math', 'Mathematics', 'Toán', '∑', 0],
    ['primary-informatics-technology', 'Informatics and Technology', 'Tin học và Công nghệ', '</>', 1],
    ['primary-nature-society', 'Nature and Society', 'Tự nhiên và Xã hội', '◎', 2],
    ['primary-science', 'Science', 'Khoa học', '◌', 3],
    ['primary-stem-exploration', 'STEM Exploration', 'Khám phá STEM', '✳', 4],
  ].map(([slug, name_en, name_vi, icon, sort_order]) => ({
    id: 'showcase-' + slug,
    slug,
    name_en,
    name_vi,
    icon,
    accent_color: getAccentColor('physics'),
    status: 'upcoming',
    sort_order,
    education_level: 'primary',
  })) as LandingSubject[],
  lower_secondary: [
    ['lower-math', 'Mathematics', 'Toán', '∑', 0],
    ['lower-natural-science', 'Natural Science', 'Khoa học tự nhiên', '⚛', 1],
    ['lower-informatics', 'Informatics', 'Tin học', '</>', 2],
    ['lower-technology', 'Technology', 'Công nghệ', '⚙', 3],
    ['lower-stem-projects', 'STEM Projects', 'Dự án STEM', '✳', 4],
  ].map(([slug, name_en, name_vi, icon, sort_order]) => ({
    id: 'showcase-' + slug,
    slug,
    name_en,
    name_vi,
    icon,
    accent_color: getAccentColor('math'),
    status: 'upcoming',
    sort_order,
    education_level: 'lower_secondary',
  })) as LandingSubject[],
  upper_secondary: [
    ['informatics', 'Informatics', 'Tin học', '</>', 'active', 0],
    ['math', 'Mathematics', 'Toán', '∑', 'upcoming', 1],
    ['physics', 'Physics', 'Vật lí', '⚛', 'upcoming', 2],
    ['chemistry', 'Chemistry', 'Hoá học', '⚗', 'upcoming', 3],
    ['biology', 'Biology', 'Sinh học', '❁', 'upcoming', 4],
  ].map(([slug, name_en, name_vi, icon, status, sort_order]) => ({
    id: 'showcase-' + slug,
    slug,
    name_en,
    name_vi,
    icon,
    accent_color: getAccentColor('informatics'),
    status,
    sort_order,
    education_level: 'upper_secondary',
  })) as LandingSubject[],
};

export default async function LandingShowcase({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (process.env.NODE_ENV !== 'development') notFound();

  const params = await searchParams;
  const level = parseEducationLevel(params.level) ?? 'primary';
  const informatics: InformaticsAvailability = params.status === 'error'
    ? { kind: 'error' }
    : params.status === 'empty'
      ? { kind: 'empty' }
      : {
          kind: 'available',
          lesson: {
            slug: 'showcase',
            title_en: 'Showcase lesson',
            title_vi: 'Bài học showcase',
          },
        };
  const catalog = params.catalog === 'error'
    ? { kind: 'error' as const }
    : { kind: 'ready' as const, subjects: catalogs[level] };

  return (
    <LandingPage
      level={level}
      levelSource={params.scope === 'account' ? 'account' : 'session'}
      catalog={catalog}
      informatics={informatics}
    />
  );
}
