/** Decorative flag for a language; the owning control carries the spoken name. */
export function FlagIcon({ lang }: { lang: 'en' | 'vi' }) {
  return (
    <img
      src={lang === 'vi' ? '/flags/vn.svg' : '/flags/gb.svg'}
      alt=""
      width={21}
      height={14}
      className="h-3.5 w-[1.3125rem] shrink-0 rounded-[3px] object-cover shadow-[0_0_0_1px_color-mix(in_srgb,currentColor_25%,transparent)]"
    />
  );
}
