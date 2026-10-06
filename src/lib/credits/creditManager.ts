import { createAdminClient } from '@/lib/supabase/admin'

export class CreditManager {
    static readonly CREDIT_COSTS = {
        ocr_per_page: 0.5,
        tts_per_1000_chars: 1,
    } as const

    /**
     * Deduct credits from a user's balance and log the transaction.
     */
    static async deductCredits(
        userId: string,
        amount: number,
        type: 'ocr' | 'tts',
        metadata: Record<string, unknown>
    ): Promise<{ success: boolean; newBalance: number }> {
        const supabase = createAdminClient()

        const { data: user } = await supabase
            .from('users')
            .select('credits_remaining')
            .eq('id', userId)
            .single()

        if (!user || user.credits_remaining < amount) {
            throw new Error('Insufficient credits')
        }

        const newBalance = user.credits_remaining - amount

        // Update balance
        await supabase
            .from('users')
            .update({
                credits_remaining: newBalance,
                total_credits_used: supabase.rpc('increment_credits_used', {
                    user_id: userId,
                    amount,
                }),
            })
            .eq('id', userId)

        // Log transaction
        await supabase.from('credit_transactions').insert({
            user_id: userId,
            transaction_type: type === 'ocr' ? 'ocr_deduction' : 'tts_deduction',
            amount: -amount,
            balance_after: newBalance,
            description: `${type.toUpperCase()} operation`,
            metadata,
        })

        // Log usage
        await supabase.from('usage_logs').insert({
            user_id: userId,
            action_type: type,
            api_provider: 'sarvam',
            credits_used: amount,
        })

        return { success: true, newBalance }
    }

    /**
     * Get current credit balance for a user.
     */
    static async getBalance(userId: string): Promise<number> {
        const supabase = createAdminClient()

        const { data } = await supabase
            .from('users')
            .select('credits_remaining')
            .eq('id', userId)
            .single()

        return data?.credits_remaining ?? 0
    }

    /**
     * Fetch credit transaction history for a user.
     */
    static async getTransactions(userId: string, limit = 50) {
        const supabase = createAdminClient()

        const { data } = await supabase
            .from('credit_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit)

        return data ?? []
    }

    /**
     * Check if a user has enough credits.
     */
    static async hasEnoughCredits(
        userId: string,
        required: number
    ): Promise<boolean> {
        const balance = await CreditManager.getBalance(userId)
        return balance >= required
    }
}
