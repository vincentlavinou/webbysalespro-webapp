'use client';

import { useEffect, useState } from "react";
import { OfferSessionClientProvider } from "./providers/OfferSessionClientProvider";
import { OfferClientUser, OfferSessionDto } from "./service/type";
import { getOfferSessionsForAttendee } from "./service/action";

type OfferClientManagerProps = {
  sessionId: string;
  user: OfferClientUser;
  children: React.ReactNode;
};

export function OfferClientManager({
  sessionId,
  user,
  children,
}: OfferClientManagerProps) {
  const [initialOffers, setInitialOffers] = useState<OfferSessionDto[]>([]);

  useEffect(() => {
    let cancelled = false;

    getOfferSessionsForAttendee({ sessionId }).then((result) => {
      if (!cancelled && result?.data) {
        setInitialOffers(result.data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <OfferSessionClientProvider
      sessionId={sessionId}
      initialOffers={initialOffers}
      user={user}
    >
      {children}
    </OfferSessionClientProvider>
  );
}
