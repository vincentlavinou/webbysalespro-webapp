import { WebinarProvider } from "@/webinar/providers";

export default async function WebinarLayout({ children, params }: { children: React.ReactNode, params: Promise<{ id: string }> }) {
    const sessionId = (await params).id
    return (
        <div className="overscroll-none">
            <WebinarProvider sessionId={sessionId}>
                {children}
            </WebinarProvider>
        </div>
    )
}