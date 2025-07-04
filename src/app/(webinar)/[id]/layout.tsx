import { WebinarProvider } from "@/webinar/providers";


export default async function WebinarLayout({ children, params }: { children: React.ReactNode, params: Promise<{ id: string }> }) {
    const sessionId = (await params).id
    return (
        <WebinarProvider sessionId={sessionId}>
            {children}
        </WebinarProvider>
    )
}