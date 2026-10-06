import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// ─── Auth Middleware ──────────────────────────────────────────────────────────

export async function withAuth(
    handler: (req: Request, session: { user: { id: string; email: string } }, supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never) => Promise<NextResponse>
) {
    return async (req: Request): Promise<NextResponse> => {
        const supabase = await createClient()
        const {
            data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return handler(req, session as any, supabase as any)
    }
}

// ─── Rate Limit Middleware ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function withRateLimit(supabase: any, userId: string, req: Request, limit = 10): Promise<NextResponse | null> {
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()

    const { count } = await supabase
        .from('api_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', oneMinuteAgo)

    if ((count ?? 0) >= limit) {
        return NextResponse.json(
            { error: 'Rate limit exceeded', limit, retryAfter: '1 minute' },
            { status: 429 }
        )
    }

    // Log this request
    await supabase.from('api_requests').insert({
        user_id: userId,
        endpoint: new URL(req.url).pathname,
        ip_address: req.headers.get('x-forwarded-for') ?? 'unknown',
    })

    return null
}

// ─── Credit Validation ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function withCredits(supabase: any, userId: string, requiredCredits: number): Promise<NextResponse | null> {
    const { data: user } = await supabase
        .from('users')
        .select('credits_remaining')
        .eq('id', userId)
        .single()

    if (!user || user.credits_remaining < requiredCredits) {
        return NextResponse.json(
            {
                error: 'Insufficient credits',
                required: requiredCredits,
                available: user?.credits_remaining ?? 0,
            },
            { status: 402 }
        )
    }

    return null
}

// ─── Combined Middleware Factory ──────────────────────────────────────────────

interface APIHandlerConfig {
    requiredCredits?: number
    rateLimit?: boolean
    rateLimitCount?: number
}

export function createAPIHandler(config: APIHandlerConfig) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (handler: (req: Request, session: any, supabase: any) => Promise<NextResponse>) => {
        return withAuth(async (req, session, supabase) => {
            // Rate limiting
            if (config.rateLimit !== false) {
                const rateLimitResult = await withRateLimit(
                    supabase,
                    session.user.id,
                    req,
                    config.rateLimitCount ?? 10
                )
                if (rateLimitResult) return rateLimitResult
            }

            // Credit validation
            if (config.requiredCredits) {
                const creditResult = await withCredits(
                    supabase,
                    session.user.id,
                    config.requiredCredits
                )
                if (creditResult) return creditResult
            }

            return handler(req, session, supabase)
        })
    }
}
