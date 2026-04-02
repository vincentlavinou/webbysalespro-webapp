// ChatMessages.tsx
'use client';

import { useEffect, useMemo, RefObject } from 'react';
import { useChat } from '@chat/hooks';
import type { ChatMessage } from 'amazon-ivs-chat-messaging';
import { ChatMessageBubble } from './ChatMessageBubble';
import { PinnedAnnouncements } from './PinnedAnnouncements';
import { OfferCarouselPanel } from '@/offer-client/components/OfferCarouselPanel';
import { CtaAnnouncementBubble } from './CtaAnnouncementBubble';
import { useBroadcastUser } from '@/broadcast/hooks/use-broadcast-user';
import { useBroadcastConfiguration } from '@/broadcast/hooks';
import { useCtaAnnouncements, type CtaAnnouncement } from '@chat/hooks/use-cta-announcements';
import { useOfferSessionClient } from '@/offer-client/hooks/use-offer-session-client';

type ChatItem =
  | { kind: 'message'; data: ChatMessage; time: number }
  | { kind: 'cta_announcement'; data: CtaAnnouncement; time: number };

interface ChatMessagesProps {
  scrollRef: RefObject<HTMLDivElement | null>
  autoStick: boolean
}

export function ChatMessages({ scrollRef, autoStick }: ChatMessagesProps) {
  const { connect, filteredMessages, connected, chatConfig } = useChat();
  const { view: offerView } = useOfferSessionClient();
  const { attendanceId } = useBroadcastUser();
  const { sessionId } = useBroadcastConfiguration();
  const { announcements } = useCtaAnnouncements(sessionId);

  // Connect once
  useEffect(() => {
    if (!connected) connect();
  }, [connected, connect]);

  const chatItems = useMemo<ChatItem[]>(() => {
    const items: ChatItem[] = [
      ...filteredMessages.map((msg) => ({
        kind: 'message' as const,
        data: msg,
        time: msg.sendTime?.getTime() ?? 0,
      })),
      ...announcements.map((ann) => ({
        kind: 'cta_announcement' as const,
        data: ann,
        time: ann.receivedAt,
      })),
    ];
    return items.sort((a, b) => a.time - b.time);
  }, [filteredMessages, announcements]);

  // Auto-stick to bottom when items change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !autoStick) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [chatItems, autoStick, scrollRef, offerView]);

  const pinnedAnnouncements = chatConfig?.pinned_announcements ?? [];
  const chatDisabled = chatConfig?.is_enabled === false;

  return (
    <>
      <div className="sticky top-0 z-10">
        <OfferCarouselPanel />
        {pinnedAnnouncements.length > 0 && (
          <PinnedAnnouncements announcements={pinnedAnnouncements} />
        )}
      </div>

      {chatDisabled ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-6 py-8">
          <p className="text-sm text-muted-foreground">Chat is currently unavailable.</p>
        </div>
      ) : chatItems.length === 0 ? (
        <div className="px-3 py-3 text-sm text-muted-foreground">
          No messages yet
        </div>
      ) : (
        <div className="px-3 py-2 space-y-1">
          {chatItems.map((item, idx) => {
            if (item.kind === 'cta_announcement') {
              return (
                <CtaAnnouncementBubble key={item.data.id} announcement={item.data} />
              );
            }

            const msg = item.data;
            const isBlocked = msg.attributes?.local_status === 'blocked';
            const blockedReason = msg.attributes?.blocked_reasons;

            return (
              <div key={msg.id ?? `${msg.sender.userId}-${idx}`} className="text-sm text-foreground">
                <ChatMessageBubble
                  name={msg.sender.attributes?.name || 'unknown'}
                  content={msg.content}
                  isSelf={msg.sender.userId === attendanceId}
                  avatarBgColor={msg.sender.attributes?.avatar_bg_color}
                  isWarning={isBlocked}
                  warningMessage={blockedReason}
                />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
