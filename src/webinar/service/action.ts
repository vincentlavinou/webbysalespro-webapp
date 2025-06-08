'use server'
import { QueryWebinar, Webinar } from "./type";
import { emptyPage, PaginationPage } from "@/components/pagination";
import { webinarApiUrl } from ".";


export async function getWebinars(query?: QueryWebinar) {
    // Fetch all webinars without search query
    const params = new URLSearchParams();
    if(query?.search) {
        params.set('search', query.search);
    }
    if(query?.page) {
        params.set('page', query.page.toString());
    }
    if(query?.page_size) {
        params.set('page_size', query.page_size.toString());
    }

    params.set('ordering', query?.ordering || '-created_at'); // Default ordering by created_at descending

    const response = await fetch(`${webinarApiUrl}/v1/webinars/public/?${params.toString()}`)
    const data: PaginationPage<Webinar[]> = await response.json()
    return data ? data : emptyPage<Webinar[]>([]);
}

export async function getWebinar(id: string): Promise<Webinar> {
    const response = await fetch(`${webinarApiUrl}/v1/webinars/${id}/public/`)
    return await response.json()
}

export async function registerForWebinar(formData: FormData): Promise<void> {
    
}