import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** The chat's submit button: a plane, and a spinner while the message is on its way. */
export function SendButton({ label, sendingLabel, sending, disabled }: { label: string; sendingLabel: string; sending: boolean; disabled: boolean }) {
  return (
    <Button type="submit" variant="ghost" size="icon" className="shrink-0 text-action [&_svg]:size-5"disabled={disabled || sending} aria-busy={sending} aria-label={sending ? sendingLabel : label}>
      {sending ? <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <Send aria-hidden="true" />}
    </Button>
  );
}
