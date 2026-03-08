import { PurchaseAnnouncement } from '@chat/hooks/use-purchase-announcements';

interface PurchaseAnnouncementBubbleProps {
  announcement: PurchaseAnnouncement;
}

export function PurchaseAnnouncementBubble({ announcement }: PurchaseAnnouncementBubbleProps) {
  return (
    <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-900 dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-200">
      <span className="leading-snug">{announcement.content}</span>
    </div>
  );
}
