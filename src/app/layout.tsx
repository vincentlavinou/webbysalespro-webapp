import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { VisitorIdInitializer } from "@/lib/VisitorIdInitializer";

export const metadata: Metadata = {
  title: {
    default: "WebbySalesPro",
    template: "%s | WebbySalesPro",
  },
  description: "View live, upcoming, and past webinars in one place.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased p-0 m-0">
        <VisitorIdInitializer />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Main Content */}
          <main className="flex-1 bg-gradient-to-b from-background via-card to-muted dark:from-background dark:via-card dark:to-muted">
            {children}
            <Toaster position="bottom-right" />
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
