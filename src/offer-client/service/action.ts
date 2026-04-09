'use server'
import { actionClient } from "@/lib/safe-action";
import { FanbasisCheckoutDto, OfferSessionDto, StripeCheckout } from "./type";
import { paymentProviderApiUrl } from "@/paymentprovider/service";
import { offersForSessionSchema, startCheckoutSchema } from "./schema";
import { handleStatus } from "@/lib/http";
import { attendeeFetch } from "@/lib/attendee-fetch";

export const startCheckout = actionClient
    .inputSchema(startCheckoutSchema)
    .action(async ({ parsedInput: { offerId, sessionId } }) => {
        const response = await attendeeFetch(
            `${paymentProviderApiUrl}/v1/sessions/${sessionId}/offers/${offerId}/checkout/`,
            { method: 'POST', body: JSON.stringify({}) }
        )
        const checkedResponse = await handleStatus(response)
        const data = await checkedResponse.json() as StripeCheckout
        return data
    })

export const startFanbasisCheckout = actionClient
    .inputSchema(startCheckoutSchema)
    .action(async ({ parsedInput: { offerId, sessionId } }) => {
        const response = await attendeeFetch(
            `${paymentProviderApiUrl}/v1/sessions/${sessionId}/offers/${offerId}/checkout/`,
            { method: 'POST', body: JSON.stringify({}) }
        )
        const checkedResponse = await handleStatus(response)
        const data = await checkedResponse.json() as FanbasisCheckoutDto
        return data
    })

export const getOfferSessionsForAttendee = actionClient
  .inputSchema(offersForSessionSchema)
  .action(async ({ parsedInput: { sessionId } }) => {
    const response = await attendeeFetch(
      `${paymentProviderApiUrl}/v1/sessions/${sessionId}/offers/`,
      { method: "GET" }
    );

    const checkedResponse = await handleStatus(response);
    return (await checkedResponse.json()) as OfferSessionDto[];
  });
