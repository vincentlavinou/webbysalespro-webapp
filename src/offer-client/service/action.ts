'use server'
import { actionClient } from "@/lib/safe-action";
import { OfferSessionDto, StripeCheckout } from "./type";
import { paymentProviderApiUrl } from "@/paymentprovider/service";
import { offersForSessionSchema, startCheckoutSchema } from "./schema";
import { handleStatus } from "@/lib/http";

export const startCheckout = actionClient
    .inputSchema(startCheckoutSchema)
    .action(async ({ parsedInput: { offerId, token, sessionId } }) => {
        const response = await fetch(
            `${paymentProviderApiUrl}/v1/sessions/${sessionId}/offers/${offerId}/checkout/?token=${token}`,
            {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({})
            },
        )
        const checkedResponse = await handleStatus(response)
        const data = await checkedResponse.json() as StripeCheckout
        return data
    })

export const getOfferSessionsForAttendee = actionClient
  .inputSchema(offersForSessionSchema)
  .action(async ({ parsedInput: { token, sessionId } }) => {
    const response = await fetch(
      `${paymentProviderApiUrl}/v1/sessions/${sessionId}/offers/?token=${token}`,
      { method: "GET", headers: { "Content-Type": "application/json" } }
    );

    const checkedResponse = await handleStatus(response);
    return (await checkedResponse.json()) as OfferSessionDto[];
  });
