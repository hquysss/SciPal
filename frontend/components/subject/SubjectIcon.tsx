import type { EducationLevel } from '@/features/landing/educationLevel';

const HAVE = ['math', 'physics', 'chemistry', 'biology', 'informatics', 'history'];
// Drawn SVGs, one per level like the pictures above.
const FLAT = ['vietnamese', 'literature', 'foreign-language-1', 'foreign-language-2', 'ethics', 'civic-education', 'economic-law-education', 'nature-society', 'science', 'natural-science', 'history-geography', 'geography', 'informatics-technology', 'technology', 'physical-education', 'national-defence', 'arts', 'music', 'fine-arts', 'experiential-activities', 'experiential-career', 'local-education', 'ethnic-language'];
const STYLE: Record<EducationLevel, string> = { primary: 'primary', lower_secondary: 'middle', upper_secondary: 'high' };

/**
 * A subject's picture for a level (bundled in /public/subject-icons), sized in em so it fills the box
 * the old glyph sat in. A subject without a picture keeps its glyph.
 */
export function SubjectIcon({ slug, glyph, level }: { slug: string; glyph: string; level: EducationLevel }) {
  const src = FLAT.includes(slug) ? `/subject-icons/${slug}-${STYLE[level]}.svg` : HAVE.includes(slug) ? `/subject-icons/${slug}-${STYLE[level]}.webp` : null;
  if (!src) return <>{glyph}</>;
  // eslint-disable-next-line @next/next/no-img-element -- small static webp, already sized
  return <img src={src} alt="" width={256} height={256} className="inline-block h-[var(--subject-icon,1.5em)] w-[var(--subject-icon,1.5em)] object-contain align-middle" />;
}
