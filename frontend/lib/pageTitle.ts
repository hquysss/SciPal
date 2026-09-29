import type { Metadata } from 'next';

// A page's tab name in both languages. The server renders the English one ("Pricing | SciPal");
// TabTitle switches the tab to the viewer's language from the two meta tags.

export const TITLE_EN = 'scipal-title-en';
export const TITLE_VI = 'scipal-title-vi';

export function pageTitle(en: string, vi: string): Pick<Metadata, 'title' | 'other'> {
  return { title: en, other: { [TITLE_EN]: en, [TITLE_VI]: vi } };
}

/** The tab text for a page name in the chosen language; no name shows SciPal alone. */
export function tabText(name: string | null | undefined): string {
  return name ? `${name} | SciPal` : 'SciPal';
}
