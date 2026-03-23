export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function WebinarLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="overscroll-none">
            {children}
        </div>
    )
}
