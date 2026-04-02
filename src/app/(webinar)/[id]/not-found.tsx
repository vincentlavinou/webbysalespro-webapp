import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function WebinarNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
      <h1 className="text-2xl font-bold mb-3">We couldn&apos;t drop you into the session</h1>
      <p className="mb-6 text-gray-600 max-w-sm">
        This session may have ended or the link has expired. Re-register to join the next one.
      </p>
      <Link href="/">
        <Button variant="outline" className="w-full max-w-xs">
          Back to Home
        </Button>
      </Link>
    </div>
  );
}
