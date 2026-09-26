import type { ReactNode } from 'react';
import { cn } from 'cn';

interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <section
      data-slot="empty-state"
      className={cn('flex flex-col items-start gap-3 rounded-xl border border-dashed border-edge bg-surface p-6', className)}
    >
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description ? <p className="max-w-prose text-sm text-ink-muted">{description}</p> : null}
      {action ? <div>{action}</div> : null}
    </section>
  );
}

export { EmptyState };
