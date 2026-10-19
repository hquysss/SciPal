import type { ComponentType, KeyboardEvent, ReactNode } from 'react';

type Icon = ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>;

/** Shared look for the round icon buttons beside a profile's main action. */
export const roundAction = 'inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-edge bg-surface text-ink transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&_svg]:size-5';
/** Pill shape for a profile's main action, on top of buttonVariants. */
export const pill = 'rounded-full px-5 font-bold';

const DEFAULT_COVER =
  'radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--sun) 55%, transparent), transparent 60%), radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, var(--sky) 55%, transparent), transparent 60%), linear-gradient(120deg, color-mix(in srgb, var(--action) 30%, var(--surface)), color-mix(in srgb, var(--coral) 35%, var(--surface)))';

/** A profile's top, after X: cover, round avatar over its edge, actions on the right, then name, bio, details and numbers. */
export function ProfileHero({ headingId, name, initials, avatarUrl, coverUrl, badge, handle, bio, meta, stats, actions }: {
  headingId: string;
  name: string;
  initials: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  /** Shown right after the name, like X's check mark. */
  badge?: ReactNode;
  handle?: ReactNode;
  bio?: string | null;
  meta: Array<{ Icon: Icon; text: ReactNode }>;
  stats: Array<{ value: string; label: string }>;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col">
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- media store image
        <img src={coverUrl} alt="" aria-hidden="true" className="h-32 w-full bg-surface-sunken object-cover sm:h-48" />
      ) : (
        <div aria-hidden="true" className="h-32 sm:h-48" style={{ background: DEFAULT_COVER }} />
      )}

      <div className="flex flex-col gap-3 px-4 pb-4 sm:px-6">
        <div className="flex items-end justify-between gap-3">
          <div className="relative z-10 -mt-12 grid size-24 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-surface bg-surface-sunken text-3xl font-extrabold text-ink sm:-mt-16 sm:size-32 sm:text-4xl">
            {avatarUrl
              // eslint-disable-next-line @next/next/no-img-element -- media store image
              ? <img src={avatarUrl} alt="" className="size-full object-cover" />
              : <span aria-hidden="true">{initials}</span>}
          </div>
          {actions && <div className="flex flex-wrap items-center justify-end gap-2 pt-3">{actions}</div>}
        </div>

        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <h1 id={headingId} className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{name}</h1>
            {badge}
          </div>
          {handle && <p className="break-all text-sm text-ink-muted">{handle}</p>}
        </div>

        {bio && <p className="max-w-prose whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{bio}</p>}

        {meta.length > 0 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
            {meta.map(({ Icon, text }, i) => (
              <li key={i} className="inline-flex items-center gap-1.5"><Icon aria-hidden="true" className="size-4" />{text}</li>
            ))}
          </ul>
        )}

        {stats.length > 0 && (
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {stats.map(({ value, label }) => (
              <div key={label} className="flex items-baseline gap-1">
                <dd className="font-bold tabular-nums text-ink">{value}</dd>
                <dt className="order-last text-ink-muted">{label}</dt>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}

/** X's tab strip: equal-width tabs, the active one bold with a short underline in the action colour. */
export function ProfileTabs<T extends string>({ label, tabs, active, onChange, idPrefix }: {
  label: string;
  tabs: Array<{ id: T; label: string }>;
  active: T;
  onChange: (id: T) => void;
  idPrefix: string;
}) {
  // WAI-ARIA tabs: one tab stop, arrows/Home/End move between tabs and select them.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((tab) => tab.id === active);
    const next = ({ ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 } as Record<string, number>)[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const tab = tabs[(next + tabs.length) % tabs.length];
    onChange(tab.id);
    document.getElementById(`${idPrefix}-tab-${tab.id}`)?.focus();
  };

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex border-b border-line">
      {tabs.map((tab) => {
        const on = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            aria-controls={`${idPrefix}-panel`}
            onClick={() => onChange(tab.id)}
            className={`relative flex min-h-12 flex-1 items-center justify-center text-sm transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${on ? 'font-bold text-ink' : 'font-medium text-ink-muted'}`}
          >
            {tab.label}
            {on && <span aria-hidden="true" className="absolute bottom-0 h-1 w-14 rounded-full bg-action" />}
          </button>
        );
      })}
    </div>
  );
}
