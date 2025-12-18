import { useState, useEffect } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import { StripeCheckoutForm } from './StripeCheckoutForm'
import { useAction } from 'next-safe-action/hooks'
import { startCheckout } from '@/offer-client/service/action'
import { notifyErrorUiMessage } from '@/lib/notify'
import { useOfferSessionClient } from '@/offer-client/hooks/use-offer-session-client'

export function StripeCheckout() {
  const {
    email,
    token,
    sessionId,
    selectedOffer,
    handleCheckoutSuccess,
  } = useOfferSessionClient()
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const { execute: fetchCheckoutInfo } = useAction(startCheckout, {
    onSuccess: async ({data}) => {
        setStripePromise(loadStripe(data.public_key))
        setClientSecret(data.client_secret)
    },
    onError: async ({error: {serverError}}) => {
      notifyErrorUiMessage(serverError)
    }
  })

  useEffect(() => {
    if(!selectedOffer) return

    fetchCheckoutInfo({
      sessionId: sessionId,
      offerId: selectedOffer?.id,
      token: token
    })
  }, [selectedOffer, token, sessionId])

  if (!stripePromise || !clientSecret) return <div>Loading payment...</div>

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <StripeCheckoutForm token={token} email={email} onSuccess={handleCheckoutSuccess}/>
    </Elements>
  )
}
