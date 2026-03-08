import { PurchaseAnnouncement } from '@chat/hooks/use-purchase-announcements';

interface PurchaseAnnouncementBubbleProps {
  announcement: PurchaseAnnouncement;
}

export function PurchaseAnnouncementBubble({ announcement }: PurchaseAnnouncementBubbleProps) {
  return (
    <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-200">
      <span className="leading-snug">{announcement.content}</span>
    </div>
  );
}
