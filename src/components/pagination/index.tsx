export type { PaginationPage } from './type'

import { PaginationPage } from './type'

export function emptyPage<T>(value: T) {
    return {
        count: 0,
        next: undefined,
        previous: undefined,
        results: value
    } as PaginationPage<T>
}


export {
    PaginationControls
} from './PaginationControls'