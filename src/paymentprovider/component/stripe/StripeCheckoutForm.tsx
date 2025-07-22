import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js'
import { useState } from 'react'

export function StripeCheckoutForm({ clientSecret }: { clientSecret: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements || !clientSecret) return

    setLoading(true)
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!,
      }
    })

    if (result.error) {
      console.error(result.error.message)
    } else if (result.paymentIntent?.status === 'succeeded') {
      alert('Payment successful!')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit" disabled={!stripe || !clientSecret || loading}>
        {loading ? 'Processing…' : 'Pay Now'}
      </button>
    </form>
  )
}
