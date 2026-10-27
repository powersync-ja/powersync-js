import { cn } from '@/library/cn';
import { Check, Copy } from 'lucide-react';

/** A copy icon that fades into a check mark once copied. Size it with `className`, e.g. `size-4`. */
export function CopyIcon({ copied, className }: { copied: boolean; className?: string }) {
  const icon = 'absolute inset-0 size-full transition duration-200';

  return (
    <span className={cn('relative inline-block shrink-0', className)}>
      <Copy className={cn(icon, copied && 'scale-75 opacity-0')} />
      <Check className={cn(icon, !copied && 'scale-75 opacity-0')} />
    </span>
  );
}
