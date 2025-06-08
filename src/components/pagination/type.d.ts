

export type PaginationPage<T> = {
    count: number;
    next?: string;
    previous?: string;
    results: T
}

export type PageProps = {
    pageSize: number;
    totalCount: number
}