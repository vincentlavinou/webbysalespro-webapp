import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function WebinarNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
      <h1 className="text-3xl font-bold mb-4">Session Not Found</h1>
      <p className="mb-6 text-gray-600">
        We couldn&apos;t find this webinar or session. The link may be invalid or expired.
      </p>
      <Link
        href="/events/browse"
      >
        <Button variant="outline" className="w-full max-w-xs">
            Back to Events
        </Button>
      </Link>
    </div>
  );
}
