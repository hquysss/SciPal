import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HELP_GUIDES } from './helpContent';
import { HelpCenter } from './HelpCenter';

describe('HelpCenter guide visuals', () => {
  it('groups all visual guides by audience', () => {
    const html = renderToStaticMarkup(<HelpCenter />);

    expect(html).toContain('id="student-guides-title"');
    expect(html).toContain('id="teacher-guides-title"');
    expect((html.match(/data-guide-visual=/g) ?? [])).toHaveLength(HELP_GUIDES.length);
  });
});
