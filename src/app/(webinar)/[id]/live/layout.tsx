import { WebinarProvider } from "@/webinar/providers";

interface LiveLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function LiveLayout({ children, params }: LiveLayoutProps) {
  const sessionId = (await params).id

  return (
    <WebinarProvider sessionId={sessionId}>
      {children}
    </WebinarProvider>
  )
}
