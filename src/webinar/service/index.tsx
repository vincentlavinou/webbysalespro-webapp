export type { 
    Webinar, 
    WebinarPresenterRequest, 
    WebinarPresenter, 
    WebinarSeries, 
    SeriesSession, 
    SessionOfferVisibilityUpdate
} from './type';

export const webinarApiUrl = process.env.WEBINAR_BASE_API_URL ? process.env.WEBINAR_BASE_API_URL : process.env.NEXT_PUBLIC_WEBINAR_BASE_API_URL ? process.env.NEXT_PUBLIC_WEBINAR_BASE_API_URL : 'https://api.webisalespro.com/api'


export { 
    getWebinars,
    getWebinar,
    registerForWebinar,
} from './action';

export {
    AlreadyRegisteredError
} from './error'