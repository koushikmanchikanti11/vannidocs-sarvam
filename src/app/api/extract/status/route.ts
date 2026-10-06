import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const documentId = searchParams.get('documentId')

        if (!documentId) {
            return NextResponse.json({ error: 'documentId is required.' }, { status: 400 })
        }

        const supabase = await createClient()

        // Get document status
        const { data: document } = await supabase
            .from('documents')
            .select('status')
            .eq('id', documentId)
            .single()

        if (!document) {
            return NextResponse.json({ status: 'failed', progress: 0 })
        }

        // If completed, get the extraction (use admin client to bypass RLS on extractions table)
        if (document.status === 'completed') {
            const admin = createAdminClient()
            const { data: extraction, error: extractionError } = await admin
                .from('extractions')
                .select('extracted_text, word_count')
                .eq('document_id', documentId)
                .single()

            if (extractionError) {
                console.error('[Status] Failed to fetch extraction:', extractionError)
            }

            const text = extraction?.extracted_text ?? ''
            console.log(`[Status] Document ${documentId} completed. Text length: ${text.length}`)

            return NextResponse.json({
                status: 'completed',
                progress: 100,
                text,
                confidence: 0.9,
            })
        }

        // Map status to progress
        const progressMap: Record<string, number> = {
            uploaded: 10,
            processing: 50,
            failed: 0,
            completed: 100,
        }

        return NextResponse.json({
            status: document.status,
            progress: progressMap[document.status] ?? 10,
        })
    } catch (err) {
        console.error('Extract status error:', err)
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
    }
}
