'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { History, LogOut, LayoutDashboard, CreditCard, Mic2 } from 'lucide-react'

export function Navbar() {
    const router = useRouter()
    const supabase = createClient()
    const [credits, setCredits] = useState<number>(0)
    const [userEmail, setUserEmail] = useState('')

    useEffect(() => {
        async function loadUser() {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (session) {
                setUserEmail(session.user.email ?? '')

                const { data: userData } = await supabase
                    .from('users')
                    .select('credits_remaining')
                    .eq('id', session.user.id)
                    .single()

                setCredits(userData?.credits_remaining ?? 0)
            }
        }
        loadUser()
    }, [supabase])

    async function handleLogout() {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md shadow-sm">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                {/* Logo */}
                <Link href="/dashboard" className="flex items-center gap-2 group">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
                        <Mic2 className="h-5 w-5" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">VaaniDoc</span>
                    <Badge variant="secondary" className="text-xs">Beta</Badge>
                </Link>

                {/* Right side */}
                <div className="flex items-center gap-3">
                    {/* Credits Pill */}
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                            {credits} Credits
                        </span>
                    </div>

                    {/* User Avatar Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                                        {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel>
                                <div className="flex flex-col gap-0.5">
                                    <p className="text-sm font-semibold">My Account</p>
                                    <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                                </div>
                            </DropdownMenuLabel>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                Dashboard
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => router.push('/history')}>
                                <History className="mr-2 h-4 w-4" />
                                History
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => router.push('/credits')}>
                                <CreditCard className="mr-2 h-4 w-4" />
                                <span className="flex-1">Credits</span>
                                <Badge variant="outline" className="ml-2">{credits}</Badge>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                onClick={handleLogout}
                                className="text-destructive focus:text-destructive"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </nav>
    )
}
