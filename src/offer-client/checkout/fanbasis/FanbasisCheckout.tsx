import { useEffect, useState, useRef } from 'react'
import { paymentProviderApiUrl } from '@/paymentprovider/service'

export function FanBasisCheckout({ offerId, webinarId, token }: { offerId: string, webinarId: string, token: string }) {
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const fetchCheckoutInfo = async () => {
      const res = await fetch(
        `${paymentProviderApiUrl}/v1/webinars/${webinarId}/offers/${offerId}/checkout/?token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }
      )
      const data = await res.json()
      if (data.checkout_url) {
        setCheckoutUrl(data.checkout_url)
      }
    }

    fetchCheckoutInfo()
  }, [offerId, webinarId, token])

  // ✅ Listen for postMessage from iframe (FanBasis should emit it on success)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Ideally you'd check origin: if (event.origin !== 'https://fanbasis.com') return
      if (event.data?.type === 'checkout_success') {
        // Navigate away, update state, etc.
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  if (!checkoutUrl) return <div>Loading checkout...</div>

  return (
    <iframe
      ref={iframeRef}
      src={checkoutUrl}
      title="FanBasis Checkout"
      style={{ width: '100%', height: '600px', border: 'none' }}
      allow="payment"
    />
  )
}
