export type { 
    Webinar, 
    WebinarPresenterRequest, 
    WebinarPresenter, 
    WebinarSeries, 
    SeriesSession, 
    SessionOfferVisibilityUpdate,
    RegisterAttendeeResponse
} from './type';

export const webinarApiUrl = process.env.WEBINAR_BASE_API_URL ? process.env.WEBINAR_BASE_API_URL : process.env.NEXT_PUBLIC_WEBINAR_BASE_API_URL ? process.env.NEXT_PUBLIC_WEBINAR_BASE_API_URL : 'https://api.webisalespro.com/api'

export const webinarAppUrl = (
    process.env.WEBINAR_APP_URL
    ?? process.env.NEXT_PUBLIC_WEBINAR_APP_URL
    ?? process.env.APP_URL
    ?? process.env.NEXT_PUBLIC_APP_URL
    ?? 'https://events.webisalespro.com')

export { 
    getWebinars,
    getWebinar,
    registerForWebinar,
} from './action';

export {
    AlreadyRegisteredError
} from './error'