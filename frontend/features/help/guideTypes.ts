export type HelpCopy = { readonly en: string; readonly vi: string };

export type HelpCategory = 'all' | 'start' | 'learn' | 'account' | 'teach';

export type HelpGuide = {
  readonly id: string;
  readonly audience: 'student' | 'teacher';
  readonly category: Exclude<HelpCategory, 'all'>;
  readonly title: HelpCopy;
  readonly description: HelpCopy;
  readonly steps: readonly HelpCopy[];
  readonly visualSteps: readonly [HelpCopy, HelpCopy, HelpCopy];
  readonly note?: HelpCopy;
  readonly href: string;
  readonly action: HelpCopy;
};

export type HelpFaq = {
  readonly id: string;
  readonly category: Exclude<HelpCategory, 'all'>;
  readonly question: HelpCopy;
  readonly answer: HelpCopy;
};
