import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function CompletedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center px-4 bg-gray-100 dark:bg-black">
      <div className="max-w-md">
        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
          Webinar Completed
        </h1>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Thank you for attending. This session has now ended.
        </p>
        <Link href="/">
          <Button variant="default">Return to Home</Button>
        </Link>
      </div>
    </div>
  );
}
