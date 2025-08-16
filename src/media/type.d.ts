import { WebinarMediaFieldType, WebinarMediaFileType } from "./enum";


export type WebinarMedia = {
    id: string;
    name: string;
    file_url: string;
    file_type: WebinarMediaFileType;
    field_type: WebinarMediaFieldType;
    updated_at: string;
}