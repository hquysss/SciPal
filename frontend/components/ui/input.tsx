import * as React from 'react';
import { cn } from 'cn';

/** The one text-field recipe: tokens only, 44px target, visible focus. Reuse it for native inputs, selects and textareas. */
export const INPUT_CLASS =
  'min-h-11 w-full rounded-lg border border-edge bg-surface px-3 text-base font-normal text-ink placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger';

function Input({ className, type = 'text', ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        INPUT_CLASS,
        className,
      )}
      {...props}
    />
  );
}

export { Input };
