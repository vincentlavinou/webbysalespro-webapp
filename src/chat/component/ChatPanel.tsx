'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@chat/hooks';
import { ChatMessage } from 'amazon-ivs-chat-messaging';
import { ChatInput } from './ChatInput';
import { ChatControl } from './ChatControl';
import { ChatMessageBubble } from './ChatMessageBubble';
import { useBroadcastUser } from '@/broadcast/hooks/use-broadcast-user';
import { useWebinar } from '@/webinar/hooks';
import { VisibleOffersCarousel } from '@/webinar/components';
import { Button } from '@/components/ui/button';
import { StripeCheckout } from '@/paymentprovider/component/stripe';
import { WebinarOffer } from '@/webinar/service';
import { getPaymentProviderLabel, PaymentProviderType } from '@/paymentprovider/service/enum';
import { FanBasisCheckout } from '@/paymentprovider/component/fanbasis';

export function ChatPanel() {
  const { connect, filteredMessages, connected } = useChat();
  const { userId, email } = useBroadcastUser();
  const { session, webinar, token } = useWebinar();

  const [selectedOffer, setSelectedOffer] = useState<WebinarOffer | undefined>(undefined);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!connected) {
      connect();
    }
  }, [connected]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [filteredMessages]);

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-md border p-2 shadow bg-background">
      {/* Scrollable message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pr-2 scroll-smooth"
      >
        {filteredMessages.length === 0 ? (
          <div className="text-sm text-muted-foreground">No messages yet</div>
        ) : (
          filteredMessages.map((msg: ChatMessage) => (
            <div key={msg.id} className="text-sm text-foreground">
              <ChatMessageBubble
                name={msg.sender.attributes?.name || 'unknown'}
                content={msg.content}
                isSelf={msg.sender.userId === userId}
              />
            </div>
          ))
        )}
      </div>

      {/* Offer carousel (hidden when offer open) */}
      {session?.offer_visible && !selectedOffer && webinar && (
        <div className="mt-2">
          <VisibleOffersCarousel offers={webinar.offers} onOfferClick={(offer) => setSelectedOffer(offer)} />
        </div>
      )}

      {/* Offer drawer and Stripe checkout */}
      {selectedOffer && (
        <div className="mt-2 p-4 border rounded bg-secondary max-h-[400px] overflow-y-auto">
          {!isCheckingOut ? (
            <>
              <h3 className="font-semibold">{selectedOffer.headline}</h3>
              <p className="text-sm text-muted-foreground mt-1">{selectedOffer.description}</p>
              <p className="text-sm text-primary mt-2">
                {selectedOffer.currency_display} {selectedOffer.price}
              </p>
              <Button className="mt-3 w-full" onClick={() => setIsCheckingOut(true)}>Buy Now</Button>
              <Button variant="ghost" className="mt-1 w-full text-xs" onClick={() => setSelectedOffer(undefined)}>
                Close
              </Button>
            </>
          ) : (
            <div className="pt-2">
              {webinar && token && email && selectedOffer.provider_display === getPaymentProviderLabel(PaymentProviderType.STRIPE) && <StripeCheckout offerId={selectedOffer.id} webinarId={webinar.id} token={token} email={email}/>}
              {webinar && token && email && selectedOffer.provider_display === getPaymentProviderLabel(PaymentProviderType.FAN_BASIS) && <FanBasisCheckout offerId={selectedOffer.id} webinarId={webinar.id} token={token} />}
              <Button variant="ghost" className="mt-2 w-full text-xs" onClick={() => setIsCheckingOut(false)}>
                ← Back to Offer
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Controls pinned at bottom */}
      <div className="mt-2 border-t pt-2">
        <ChatControl />
        <ChatInput />
      </div>
    </div>
  );
}
