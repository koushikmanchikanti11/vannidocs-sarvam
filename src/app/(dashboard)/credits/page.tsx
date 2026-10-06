import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard, TrendingDown, TrendingUp, Gift } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const TRANSACTION_ICONS: Record<string, React.ElementType> = {
    signup_bonus: Gift,
    ocr_deduction: TrendingDown,
    tts_deduction: TrendingDown,
    refund: TrendingUp,
    admin_grant: TrendingUp,
}

export default async function CreditsPage() {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) redirect('/login')

    const { data: user } = await supabase
        .from('users')
        .select('credits_remaining, total_credits_used')
        .eq('id', session.user.id)
        .single()

    const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50)

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <CreditCard className="h-6 w-6" /> Credits
                </h1>
                <p className="text-muted-foreground text-sm mt-1">Manage and track your credit balance</p>
            </div>

            {/* Balance Cards */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="p-5 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200">
                    <p className="text-sm text-muted-foreground">Available Credits</p>
                    <p className="text-4xl font-extrabold text-emerald-600 mt-1">{user?.credits_remaining ?? 0}</p>
                </Card>
                <Card className="p-5">
                    <p className="text-sm text-muted-foreground">Total Used</p>
                    <p className="text-4xl font-extrabold mt-1">{user?.total_credits_used ?? 0}</p>
                </Card>
            </div>

            {/* Cost reference */}
            <Card className="p-4 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800">
                <p className="text-sm font-semibold mb-3">Credit Costs</p>
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">OCR: 0.5 credits / page</Badge>
                    <Badge variant="outline">TTS: 1 credit / 1,000 chars</Badge>
                </div>
            </Card>

            {/* Transaction History */}
            <div className="space-y-3">
                <h2 className="font-semibold">Transaction History</h2>
                {transactions && transactions.length > 0 ? (
                    <div className="space-y-2">
                        {transactions.map((tx) => {
                            const Icon = TRANSACTION_ICONS[tx.transaction_type] ?? CreditCard
                            const isDebit = tx.amount < 0
                            return (
                                <Card key={tx.id} className="p-4 flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isDebit ? 'bg-red-100 dark:bg-red-950' : 'bg-emerald-100 dark:bg-emerald-950'}`}>
                                        <Icon className={`h-4 w-4 ${isDebit ? 'text-red-600' : 'text-emerald-600'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium capitalize">{tx.transaction_type.replace(/_/g, ' ')}</p>
                                        <p className="text-xs text-muted-foreground">{tx.description}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${isDebit ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {isDebit ? '' : '+'}{tx.amount}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Balance: {tx.balance_after}</p>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                ) : (
                    <Card className="p-10 text-center border-dashed">
                        <p className="text-muted-foreground text-sm">No transactions yet.</p>
                    </Card>
                )}
            </div>
        </div>
    )
}
