import type { ReactNode } from 'react';

export type FieldControlProps = { id: string; 'aria-describedby'?: string; 'aria-invalid'?: true };

interface FieldProps {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  children: (control: FieldControlProps) => ReactNode;
}

function Field({ id, label, description, error, children }: FieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;
  const control: FieldControlProps = {
    id,
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    ...(error ? { 'aria-invalid': true as const } : {}),
  };

  return (
    <div data-slot="field" className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {description ? (
        <p id={descriptionId} className="text-sm text-ink-muted">
          {description}
        </p>
      ) : null}
      {children(control)}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { Field };
