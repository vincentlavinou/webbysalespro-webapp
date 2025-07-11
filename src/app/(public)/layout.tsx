interface PublicLayoutProps {
    children: React.ReactNode
}

export default async function PublicLayout({children}: PublicLayoutProps) {

    return(
        <main className="flex-1 max-w-7xl mx-auto px-4 py-6">
            {children}
        </main>
    )
}