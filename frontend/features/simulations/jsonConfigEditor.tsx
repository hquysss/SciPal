'use client';

import { useId, useState, type ReactNode } from 'react';
import { Copy } from 'lucide-react';
import type { z } from 'zod';
import { ImageDropZone } from '@/features/authoring/editor/editors/ImageEditor';
import { BUTTON, FIELD } from './controls';
import { pick, type Bilingual, type Lang } from './types';

export type ConfigIssue = { path: PropertyKey[]; message: string };

/** Where in the JSON a problem is, written like `steps[2].routes[0].points[3]`. */
export const issuePath = (path: PropertyKey[]) => path.map((k, i) => (typeof k === 'number' ? `[${k}]` : `${i ? '.' : ''}${String(k)}`)).join('') || '(gốc / root)';

const plainIssue = (issue: ConfigIssue): Bilingual => {
  const at = issuePath(issue.path);
  return { en: `${at}: ${issue.message}`, vi: `${at}: giá trị không hợp lệ (${issue.message}).` };
};

/**
 * A template's whole config as JSON, checked as the teacher types; only a config that passes
 * `schema` reaches the lesson, so a half-typed edit never breaks the preview.
 */
export function JsonConfigEditor<T>({
  config,
  schema,
  onChange,
  lang,
  help,
  explain = plainIssue,
  children,
}: {
  config: T;
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
  onChange: (config: T) => void;
  lang: Lang;
  help: Bilingual;
  explain?: (issue: ConfigIssue, raw: unknown) => Bilingual;
  children?: ReactNode;
}) {
  const t = pick(lang);
  const id = useId();
  const [text, setText] = useState(() => JSON.stringify(config, null, 2));
  const [errors, setErrors] = useState<Bilingual[]>([]);

  const edit = (value: string) => {
    setText(value);
    let raw: unknown;
    try {
      raw = JSON.parse(value);
    } catch (e) {
      setErrors([{ en: `Not valid JSON: ${(e as Error).message}`, vi: `JSON chưa đúng cú pháp: ${(e as Error).message}` }]);
      return;
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      setErrors(parsed.error.issues.slice(0, 5).map((issue) => explain(issue, raw)));
      return;
    }
    setErrors([]);
    onChange(parsed.data);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {t({ en: 'Data (JSON)', vi: 'Dữ liệu (JSON)' })}
      </label>
      <textarea
        id={id}
        value={text}
        rows={18}
        spellCheck={false}
        aria-invalid={errors.length > 0 || undefined}
        aria-describedby={`${id}-help`}
        onChange={(e) => edit(e.target.value)}
        className={`${FIELD} min-h-64 font-mono text-xs leading-relaxed`}
      />
      <p id={`${id}-help`} className="text-xs text-ink-muted">
        {t(help)}
      </p>
      {errors.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 text-sm font-medium text-danger">
          {errors.map((e, i) => (
            <li key={i}>{t(e)}</li>
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}

/** Uploads a picture to lesson media and hands back its link, to paste into an `image_url`. */
export function UploadLink({ lang }: { lang: Lang }) {
  const t = pick(lang);
  const [uploaded, setUploaded] = useState<string | null>(null);
  return (
    <div className="mt-2 flex flex-col gap-2">
      <ImageDropZone onImage={(image) => setUploaded(image.url)} />
      {uploaded && (
        <div className="flex items-center gap-2">
          <input readOnly value={uploaded} aria-label={t({ en: 'Uploaded image link', vi: 'Link ảnh vừa tải' })} className={`${FIELD} font-mono text-xs`} onFocus={(e) => e.target.select()} />
          <button type="button" className={BUTTON} aria-label={t({ en: 'Copy the link', vi: 'Chép link' })} onClick={() => void navigator.clipboard?.writeText(uploaded)}>
            <Copy aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
