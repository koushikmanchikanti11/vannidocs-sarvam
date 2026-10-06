'use client'

import dynamic from 'next/dynamic'

// Render Navbar only on the client to avoid Radix UI hydration ID mismatch
const Navbar = dynamic(() => import('@/components/Navbar').then((m) => m.Navbar), {
    ssr: false,
})

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto px-4 py-8 max-w-5xl">
                {children}
            </main>
        </div>
    )
}
