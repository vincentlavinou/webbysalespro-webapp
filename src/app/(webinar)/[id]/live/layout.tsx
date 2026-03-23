import type { Viewport } from "next";
import { WebinarProvider } from "@/webinar/providers";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

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
