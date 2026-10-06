import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SarvamVisionClient } from '@/lib/sarvam/vision'
import { CreditManager } from '@/lib/credits/creditManager'

export async function POST(req: Request) {
    try {
        const { documentId, language } = await req.json()

        if (!documentId) {
            return NextResponse.json({ error: 'documentId is required.' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
        }

        // Fetch document record
        const { data: document, error: docError } = await supabase
            .from('documents')
            .select('file_url, language, status')
            .eq('id', documentId)
            .eq('user_id', user.id)
            .single()

        if (docError || !document) {
            return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
        }

        // Prevent duplicate extraction
        if (document.status === 'processing' || document.status === 'completed') {
            return NextResponse.json({ message: 'Already processing or completed.', status: document.status })
        }

        // Mark as processing immediately
        await supabase
            .from('documents')
            .update({ status: 'processing' })
            .eq('id', documentId)

        // ---------------------------------------------------------------
        // Fire-and-forget: run the long OCR job without blocking the response
        // Next.js keeps the process alive with waitUntil if available,
        // otherwise we let the async function run in the background.
        // ---------------------------------------------------------------
        const userId = user.id
        const effectiveLang = language || document.language

        runOCRInBackground(documentId, userId, document.file_url, effectiveLang)

        // Return immediately so the client can start polling
        return NextResponse.json({ success: true, status: 'processing' })

    } catch (err) {
        console.error('Extract error:', err)
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
    }
}

// Runs fully in background — does not block the HTTP response
// Uses admin client (service role) to bypass RLS for all DB writes.
async function runOCRInBackground(
    documentId: string,
    userId: string,
    fileUrl: string,
    language: string
) {
    // Admin client bypasses RLS — safe for server-only background tasks
    const admin = createAdminClient()

    try {
        // Download file from storage
        const { data: fileData, error: downloadError } = await admin.storage
            .from('documents')
            .download(fileUrl)

        if (downloadError || !fileData) {
            console.error('[OCR] File download failed:', downloadError)
            await admin.from('documents').update({ status: 'failed' }).eq('id', documentId)
            return
        }

        // Call Sarvam Vision API (async job — can take up to 120s)
        const visionClient = new SarvamVisionClient()
        const result = await visionClient.extractText({
            file: fileData,
            language,
        })

        console.log(`[OCR] Extracted ${result.text.length} chars, ${result.pages} page(s) for document ${documentId}`)

        // Calculate credits: 0.5 per page
        const creditsToDeduct = (result.pages || 1) * 0.5

        // Check credits
        const hasCredits = await CreditManager.hasEnoughCredits(userId, creditsToDeduct)
        if (!hasCredits) {
            console.warn(`[OCR] Insufficient credits for user ${userId}`)
            await admin.from('documents').update({ status: 'failed' }).eq('id', documentId)
            return
        }

        // Deduct credits
        await CreditManager.deductCredits(userId, creditsToDeduct, 'ocr', {
            documentId,
            pages: result.pages,
            language,
        })

        // Store extraction result using admin client to bypass RLS
        const { error: insertError } = await admin
            .from('extractions')
            .insert({
                document_id: documentId,
                extracted_text: result.text,
                word_count: result.text.split(/\s+/).filter(Boolean).length,
                sarvam_request_id: result.request_id,
            })

        if (insertError) {
            console.error('[OCR] Failed to insert extraction record:', insertError)
            await admin.from('documents').update({ status: 'failed' }).eq('id', documentId)
            return
        }

        console.log(`[OCR] Extraction saved. Marking document ${documentId} as completed.`)

        // Mark document as completed — the status poller will pick this up
        const { error: updateError } = await admin
            .from('documents')
            .update({ status: 'completed' })
            .eq('id', documentId)

        if (updateError) {
            console.error('[OCR] Failed to update document status to completed:', updateError)
        }

    } catch (err) {
        console.error('[OCR] Background OCR error:', err)
        // Mark as failed so the poller shows an error
        const admin2 = createAdminClient()
        await admin2.from('documents').update({ status: 'failed' }).eq('id', documentId)
    }
}
