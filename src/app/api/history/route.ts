import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const limit = parseInt(searchParams.get('limit') ?? '20', 10)
        const offset = parseInt(searchParams.get('offset') ?? '0', 10)

        const { data: documents, count } = await supabase
            .from('documents')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        return NextResponse.json({ documents: documents ?? [], total: count ?? 0 })
    } catch (err) {
        console.error('History error:', err)
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
    }
}
