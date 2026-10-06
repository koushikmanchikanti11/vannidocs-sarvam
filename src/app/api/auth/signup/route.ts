import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { email, password, fullName } = await req.json()

        if (!email || !password || !fullName) {
            return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
        }

        const supabase = await createClient()

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
        })

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        if (!authData.user) {
            return NextResponse.json({ error: 'Failed to create user.' }, { status: 400 })
        }

        // Create user profile with 5 credits
        const { error: profileError } = await supabase.from('users').insert({
            id: authData.user.id,
            email,
            full_name: fullName,
            credits_remaining: 5,
            signup_bonus_claimed: true,
        })

        if (profileError) {
            return NextResponse.json({ error: profileError.message }, { status: 400 })
        }

        // Log credit transaction
        await supabase.from('credit_transactions').insert({
            user_id: authData.user.id,
            transaction_type: 'signup_bonus',
            amount: 5,
            balance_after: 5,
            description: 'Welcome bonus — 5 free credits',
        })

        return NextResponse.json({
            message: 'Signup successful! 5 credits added to your account.',
            user: authData.user,
        })
    } catch (err) {
        console.error('Signup error:', err)
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
    }
}
