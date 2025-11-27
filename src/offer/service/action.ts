import { actionClient } from "@/lib/safe-action";
import { StripeCheckout } from "./type";
import { paymentProviderApiUrl } from "@/paymentprovider/service";
import { startCheckoutSchema } from "./schema";


export const startCheckout = actionClient
    .inputSchema(startCheckoutSchema)
    .action(async ({ parsedInput: { webinarId, offerId, token, sessionId } }) => {
        const res = await fetch(
            `${paymentProviderApiUrl}/v1/webinars/${webinarId}/offers/${offerId}/checkout/?token=${token}&session=${sessionId}`,
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