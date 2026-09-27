export interface LinkClick {
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  /** The link clicked, if any. */
  anchor: { href: string; target: string; download: boolean } | null;
}

/**
 * The address a click navigates this tab to, or null when the editor stays open. Client-side
 * navigation (Next.js links) never fires `beforeunload`, so the editor checks clicks itself.
 */
export function leavingHref(click: LinkClick, here: URL): string | null {
  const { anchor } = click;
  if (!anchor || !anchor.href || click.defaultPrevented || click.button !== 0) return null;
  if (click.ctrlKey || click.metaKey || click.shiftKey || click.altKey) return null;
  if ((anchor.target && anchor.target !== '_self') || anchor.download) return null;
  const to = new URL(anchor.href, here);
  if (to.origin === here.origin && to.pathname === here.pathname && to.search === here.search) return null;
  return to.href;
}
