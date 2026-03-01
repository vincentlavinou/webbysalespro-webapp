'use client';

import { useState } from 'react'

export interface PresentationViewCardProps {
    presentation?: {
        /** Public or presigned URL to the PPT/PPTX/PDF file */
        downloadUrl: string
        /** When true, show the office iframe instead of video */
        active: boolean
        /** Optional: set a UI locale code understood by Office (e.g., 'en-US') */
        ui?: string
    }
}

const buildOfficeEmbedUrl = (fileUrl: string, ui?: string) => {
    const src = encodeURIComponent(fileUrl)
    const uiParam = ui ? `&ui=${encodeURIComponent(ui)}` : ''
    return `https://view.officeapps.live.com/op/embed.aspx?src=${src}${uiParam}`
}

export const PresentationView = ({ presentation }: PresentationViewCardProps) => {
    return (<PresentationViewCard presentation={presentation} />);
};

const PresentationViewCard = ({
    presentation
}: PresentationViewCardProps) => {

    const showPresentation = !!presentation?.active && !!presentation?.downloadUrl

    const [iframeLoaded, setIframeLoaded] = useState(false)
    const officeSrc = showPresentation ? buildOfficeEmbedUrl(presentation!.downloadUrl, presentation?.ui) : ''

    return (
        <div className={`w-full max-h-[80vh] aspect-video rounded-md border overflow-hidden relative bg-black group`}>
            {/* Office Web Viewer */}
            <iframe
                id="office-slide-iframe"
                src={officeSrc}
                className="absolute inset-0 w-full h-full border-0"
                allowFullScreen
                title="PowerPoint Preview"
                onLoad={() => setIframeLoaded(true)}
            />
            {!iframeLoaded && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-white/80">
                    Loading slides…
                </div>
            )}
        </div>
    );
};
