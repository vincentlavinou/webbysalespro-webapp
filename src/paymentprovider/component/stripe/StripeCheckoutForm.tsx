import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'
import { useState } from 'react'

export function StripeCheckoutForm({ email }: { email: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        payment_method_data: {
          billing_details: {
            email,
          },
        },
      },
      redirect: 'if_required',
    })

    if (error) {
      setMessage(error.message ?? 'Payment failed.')
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      setMessage('Payment successful!')
      // Optionally trigger your own callback here
    } else {
      setMessage('Payment processing or requires action.')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="submit" disabled={!stripe || loading} className="mt-4">
        {loading ? 'Processing…' : 'Pay Now'}
      </button>
      {message && <div className="text-red-500 text-sm mt-2">{message}</div>}
    </form>
  )
}
