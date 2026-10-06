import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DocumentCard } from '@/components/DocumentCard'
import { CreditDisplay } from '@/components/CreditDisplay'
import { Plus, History, Zap } from 'lucide-react'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) redirect('/login')

    // Fetch user data
    const { data: userData } = await supabase
        .from('users')
        .select('full_name, credits_remaining, total_credits_used')
        .eq('id', session.user.id)
        .single()

    // Fetch recent documents
    const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5)

    const firstName = userData?.full_name?.split(' ')[0] || 'there'

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Hello, {firstName} 👋</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Convert Indian language documents to speech
                    </p>
                </div>
                <Button asChild>
                    <Link href="/convert">
                        <Plus className="h-4 w-4 mr-2" />
                        New Conversion
                    </Link>
                </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CreditDisplay className="sm:col-span-1" />

                <Card className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
                        <History className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{documents?.length ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Recent Documents</p>
                    </div>
                </Card>

                <Card className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950">
                        <Zap className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{userData?.total_credits_used ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Credits Used</p>
                    </div>
                </Card>
            </div>

            {/* Recent Documents */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-base">Recent Documents</h2>
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/history">
                            View All <History className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                    </Button>
                </div>

                {documents && documents.length > 0 ? (
                    <div className="space-y-2">
                        {documents.map((doc) => (
                            <DocumentCard key={doc.id} document={doc} />
                        ))}
                    </div>
                ) : (
                    <Card className="p-12 text-center border-dashed">
                        <p className="text-muted-foreground text-sm">No documents yet.</p>
                        <Button className="mt-4" asChild>
                            <Link href="/convert">
                                <Plus className="h-4 w-4 mr-2" /> Upload your first document
                            </Link>
                        </Button>
                    </Card>
                )}
            </div>

            {/* Quick Help */}
            <Card className="p-5 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800">
                <h3 className="font-semibold text-sm mb-2">💡 Credit Costs</h3>
                <div className="flex flex-wrap gap-3">
                    <Badge variant="outline">OCR: 0.5 credits / page</Badge>
                    <Badge variant="outline">TTS: 1 credit / 1,000 chars</Badge>
                    <Badge variant="outline" className="text-indigo-700 border-indigo-400">Signup Bonus: 5 free credits</Badge>
                </div>
            </Card>
        </div>
    )
}
