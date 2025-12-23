import { cn } from '@/lib/utils';

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn('w-full py-4 text-center text-sm text-muted-foreground', className)}>
      built with{' '}
      <a href="https://powersync.com" target="_blank" rel="noopener" className="underline">
        PowerSync
      </a>{' '}
      💜 and{' '}
      <a href="https://neon.tech/home" target="_blank" rel="noopener" className="underline">
        Neon
      </a>{' '}
      💚
    </footer>
  );
}
