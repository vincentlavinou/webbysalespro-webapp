import { Button } from '@/components/ui/button'
import { useWebinar } from '@/webinar/hooks'
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface StripeCheckoutFormProps {
  email: string
  token: string
  onSuccess: (paymentIntentId: string) => void
}

export function StripeCheckoutForm({ 
  email,
  token,
  onSuccess 
}: StripeCheckoutFormProps) {
  
  const {recordEvent} = useWebinar()
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    await recordEvent("checkout_started", token)

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
      toast.error(`${error.message ?? 'Payment failed.'}`)
      if(error.code === "card_declined" && error.decline_code) {
        await recordEvent(error.decline_code, token)
      }
      
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent.id)
    } else {
      toast.error('Payment processing or requires action.')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <Button type="submit" disabled={!stripe || loading} className="mt-4">
        {loading ? 'Processing…' : 'Pay Now'}
      </Button>
    </form>
  )
}
