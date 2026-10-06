import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreditManager } from '@/lib/credits/creditManager'

export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const limit = parseInt(searchParams.get('limit') ?? '50', 10)

        const transactions = await CreditManager.getTransactions(user.id, limit)
        return NextResponse.json({ transactions })
    } catch (err) {
        console.error('Transactions error:', err)
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
    }
}
