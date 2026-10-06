'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CreditCard, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function CreditDisplay({ className }: { className?: string }) {
    const supabase = createClient()
    const [credits, setCredits] = useState<number | null>(null)

    useEffect(() => {
        async function load() {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return
            const { data } = await supabase
                .from('users')
                .select('credits_remaining')
                .eq('id', session.user.id)
                .single()
            setCredits(data?.credits_remaining ?? 0)
        }
        load()
    }, [supabase])

    const low = credits !== null && credits < 2

    return (
        <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border', low ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800' : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800', className)}>
            {low ? (
                <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />
            ) : (
                <CreditCard className="h-4 w-4 text-emerald-600 shrink-0" />
            )}
            <div className="flex flex-col">
                <span className={cn('text-xs font-semibold', low ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400')}>
                    {credits === null ? '…' : credits} Credits
                </span>
                {low && <span className="text-[10px] text-red-500">Running low!</span>}
            </div>
            {credits !== null && <Badge variant="outline" className="ml-1 text-xs">{credits}</Badge>}
        </div>
    )
}
