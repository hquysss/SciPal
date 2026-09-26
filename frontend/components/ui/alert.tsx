import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { cn } from 'cn';

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<AlertTone, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: 'border-edge bg-surface-sunken text-ink' },
  success: { icon: CircleCheck, className: 'border-transparent bg-success-surface text-success' },
  warning: { icon: TriangleAlert, className: 'border-transparent bg-warning-surface text-warning' },
  danger: { icon: CircleAlert, className: 'border-transparent bg-danger-surface text-danger' },
};

interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

function Alert({ tone = 'info', title, children, className }: AlertProps) {
  const { icon: Icon, className: toneClass } = TONES[tone];
  return (
    <div
      data-slot="alert"
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg border p-4 text-sm', toneClass, className)}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}

export { Alert };
