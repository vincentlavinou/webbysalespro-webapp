export const paymentProviderApiUrl = process.env.PAYMENT_PROVIDER_API_URL ? process.env.PAYMENT_PROVIDER_API_URL : process.env.NEXT_PUBLIC_PAYMENT_PROVIDER_API_URL ? process.env.NEXT_PUBLIC_PAYMENT_PROVIDER_API_URL : 'https://api.webisalespro.com/api'

export {
    createPaymentProvider,
    getAllPaymentProviders,
    getPaymentProvider,
    updatePaymentProvider,
    deletePaymentProvider
} from './action'