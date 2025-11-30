import { useState, useEffect } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import { StripeCheckoutForm } from './StripeCheckoutForm'
import type { StripeCheckout } from '@/offer/service/type'
import { useAction } from 'next-safe-action/hooks'
import { startCheckout } from '@/offer/service/action'
import { notifyErrorUiMessage } from '@/lib/notify'

interface StripeCheckoutProps {
  offerId: string, 
  webinarId: string, 
  token: string, 
  email: string, 
  sessionId:  string,
  onSuccess: (paymentIntentId: string) => void
}

export function StripeCheckout({ 
  offerId, 
  webinarId, 
  token, 
  email,
  sessionId,
  onSuccess 
}: StripeCheckoutProps) {
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
    fetchCheckoutInfo({
      webinarId: webinarId,
      sessionId: sessionId,
      offerId: offerId,
      token: token
    })
  }, [webinarId, offerId, token])

  if (!stripePromise || !clientSecret) return <div>Loading payment...</div>

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <StripeCheckoutForm token={token} email={email} onSuccess={onSuccess}/>
    </Elements>
  )
}
