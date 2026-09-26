import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';

const buttonVariants = cva(
  'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-transparent px-4 text-sm font-semibold transition-colors select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-50 aria-[invalid=true]:border-danger [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-action text-action-ink hover:bg-action-hover',
        outline: 'border-edge bg-surface text-ink hover:bg-surface-sunken',
        secondary: 'bg-surface-sunken text-ink hover:bg-[color-mix(in_srgb,var(--surface-sunken),var(--ink)_6%)]',
        ghost: 'text-ink hover:bg-surface-sunken',
        destructive: 'bg-danger-surface text-danger hover:bg-[color-mix(in_srgb,var(--danger-surface),var(--danger)_10%)]',
        link: 'px-0 text-action underline-offset-4 hover:underline',
      },
      size: {
        default: '',
        lg: 'min-h-12 px-5 text-base',
        icon: 'size-11 px-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
