import type { HelpGuide } from './guideTypes';
import { useLanguage } from '@scipal/hooks';

export function GuideIllustration({ guide }: { readonly guide: HelpGuide }) {
  const { t } = useLanguage();
  return (
    <figure aria-hidden="true" data-guide-visual={guide.id} className="relative mb-5">
      <svg aria-hidden="true" focusable="false" className="pointer-events-none absolute inset-x-0 top-4 h-8 w-full" viewBox="0 0 360 40" preserveAspectRatio="none">
        <path d="M60 20H300" fill="none" stroke="var(--line)" strokeWidth="4" />
        <path d="M60 20H300" fill="none" stroke="var(--action)" strokeWidth="2" />
      </svg>
      <ol className="relative grid grid-cols-3 gap-1">
        {guide.visualSteps.map((step, index) => (
          <li key={step.en} className="flex min-w-0 flex-col items-center gap-2 text-center">
            <span className="flex size-8 items-center justify-center rounded-full bg-action text-sm font-bold text-action-ink sm:size-9">
              {index + 1}
            </span>
            <span className="text-xs font-semibold leading-snug text-ink sm:text-sm">{t(step)}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
