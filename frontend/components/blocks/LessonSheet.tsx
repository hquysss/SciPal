import type { ReactNode } from 'react';
import styles from './notebook.module.css';

/**
 * The lesson's notebook page. `squared` comes from the lesson's own grade so a primary reader
 * opening a THPT lesson still gets ruled paper. No `data-pattern="off"`: the theme paints that
 * attribute with `--paper`, which would override the sheet's `--surface`; the solid sheet already
 * hides the background motif.
 */
export function LessonSheet({ squared, children }: { squared: boolean; children: ReactNode }) {
  return (
    <article className={styles.sheet} data-paper={squared ? 'squared' : 'ruled'}>
      {children}
    </article>
  );
}
