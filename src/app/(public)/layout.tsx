import { BrandMark } from "@/components/BrandMark"
import { ThemeToggle } from "@/components/theme"
import Link from "next/link"

interface PublicLayoutProps {
    children: React.ReactNode
}

export default async function PublicLayout({ children }: PublicLayoutProps) {

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
            {/* Header */}
            <header className="bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between max-w-7xl mx-auto px-6 py-4">
                    <BrandMark href="/" />
                    <nav className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-300">
                        <ThemeToggle />
                    </nav>
                </div>
            </header>
            <main className="flex-1 max-w-7xl mx-auto px-4 py-6">
                {children}
            </main>
            {/* Footer */}
            <footer className="border-t border-slate-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
                <div className="max-w-7xl mx-auto py-6 px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-3">
                        <BrandMark size="sm" showText />
                        <span>© {new Date().getFullYear()} All rights reserved.</span>
                    </div>
                    <div className="flex gap-4">
                        <Link
                            href="/privacy-policy"
                            className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                        >
                            Privacy
                        </Link>
                        <Link
                            href="/terms-of-service"
                            className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                        >
                            Terms
                        </Link>
                        <Link
                            href="/contact"
                            className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                        >
                            Contact
                        </Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
