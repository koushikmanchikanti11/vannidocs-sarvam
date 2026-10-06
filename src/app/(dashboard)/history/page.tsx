import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DocumentCard } from '@/components/DocumentCard'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { History } from 'lucide-react'

export default async function HistoryPage() {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) redirect('/login')

    const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <History className="h-6 w-6" /> Document History
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">All your converted documents</p>
                </div>
                <Badge variant="outline">{documents?.length ?? 0} documents</Badge>
            </div>

            {documents && documents.length > 0 ? (
                <div className="space-y-2">
                    {documents.map((doc) => (
                        <DocumentCard key={doc.id} document={doc} />
                    ))}
                </div>
            ) : (
                <Card className="p-16 text-center border-dashed">
                    <History className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No documents yet. Upload your first document to get started.</p>
                </Card>
            )}
        </div>
    )
}
