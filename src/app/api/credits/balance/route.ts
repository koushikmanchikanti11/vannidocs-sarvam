import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreditManager } from '@/lib/credits/creditManager'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
        }

        const balance = await CreditManager.getBalance(user.id)
        return NextResponse.json({ balance })
    } catch (err) {
        console.error('Credits balance error:', err)
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
    }
}
