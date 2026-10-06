import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(req: NextRequest) {
    let supabaseResponse = NextResponse.next({ request: req })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return req.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        req.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({ request: req })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { session },
    } = await supabase.auth.getSession()

    const pathname = req.nextUrl.pathname

    // If not logged in and trying to access protected routes → redirect to login
    if (
        !session &&
        (pathname.startsWith('/dashboard') ||
            pathname.startsWith('/convert') ||
            pathname.startsWith('/history') ||
            pathname.startsWith('/credits'))
    ) {
        return NextResponse.redirect(new URL('/login', req.url))
    }

    // If logged in and trying to access auth routes → redirect to dashboard
    if (session && (pathname === '/login' || pathname === '/signup')) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/convert/:path*',
        '/history/:path*',
        '/credits/:path*',
        '/login',
        '/signup',
    ],
}
