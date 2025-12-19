'use server'
import { actionClient } from "@/lib/safe-action";
import { OfferSessionDto, StripeCheckout } from "./type";
import { paymentProviderApiUrl } from "@/paymentprovider/service";
import { offersForSessionSchema, startCheckoutSchema } from "./schema";

export const startCheckout = actionClient
    .inputSchema(startCheckoutSchema)
    .action(async ({ parsedInput: { offerId, token, sessionId } }) => {
        const res = await fetch(
            `${paymentProviderApiUrl}/v1/sessions/${sessionId}/offers/${offerId}/checkout/?token=${token}`,
            {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({})
            },
        )
        const data = await res.json() as StripeCheckout
        return data
    })

export const getOfferSessionsForAttendee = actionClient
  .inputSchema(offersForSessionSchema)
  .action(async ({ parsedInput: { token, sessionId } }) => {
    const res = await fetch(
      `${paymentProviderApiUrl}/v1/sessions/${sessionId}/offers/?token=${token}`,
      { method: "GET", headers: { "Content-Type": "application/json" } }
    );

    if (!res.ok) throw new Error("Failed to load offer sessions");
    return (await res.json()) as OfferSessionDto[];
  });