import Image from 'next/image';
import { SyncedContent } from '@/components/SyncedContent';

export default function HomePage() {
  return (
    <div className="flex min-h-screen justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col">
        <div className="mb-8 flex justify-center">
          <Image src="/powersync-logo.svg" alt="PowerSync" width={200} height={31} priority />
        </div>
        <SyncedContent />
      </div>
    </div>
  );
}
