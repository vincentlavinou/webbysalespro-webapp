import { useState, useEffect } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import { StripeCheckoutForm } from './StripeCheckoutForm'
import { paymentProviderApiUrl } from '@/paymentprovider/service'

export function StripeCheckout({ 
  offerId, 
  webinarId, 
  token, 
  email,
  sessionId 
}: { offerId: string, webinarId: string, token: string, email: string, sessionId: string }) {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  useEffect(() => {
    const fetchCheckoutInfo = async () => {
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
      const data = await res.json()

      if (data.public_key && data.client_secret) {
        setStripePromise(loadStripe(data.public_key))
        setClientSecret(data.client_secret)
      }
    }

    fetchCheckoutInfo()
  }, [])

  if (!stripePromise || !clientSecret) return <div>Loading payment...</div>

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <StripeCheckoutForm email={email}/>
    </Elements>
  )
}
