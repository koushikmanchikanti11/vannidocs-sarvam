import { NextResponse } from 'next/server'
import { createAPIHandler } from '@/lib/middleware/apiMiddleware'
import { createClient } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

export const POST = await createAPIHandler({ rateLimit: true })(
    async (req: Request, session: { user: { id: string } }) => {
        try {
            const formData = await req.formData()
            const file = formData.get('file') as File | null
            const language = (formData.get('language') as string) || 'hi'

            if (!file) {
                return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
            }

            if (!ACCEPTED_TYPES.includes(file.type)) {
                return NextResponse.json({ error: 'Invalid file type. Please upload a PDF, JPG, PNG, or WebP.' }, { status: 400 })
            }

            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 })
            }

            const supabase = await createClient()
            const userId = session.user.id

            // Upload to Supabase Storage
            const fileExt = file.name.split('.').pop()
            const storagePath = `${userId}/${Date.now()}.${fileExt}`
            const arrayBuffer = await file.arrayBuffer()

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(storagePath, arrayBuffer, {
                    contentType: file.type,
                    upsert: false,
                })

            if (uploadError) {
                return NextResponse.json({ error: 'Failed to upload file to storage.' }, { status: 500 })
            }

            const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(storagePath)

            // Create document record
            const { data: document, error: dbError } = await supabase
                .from('documents')
                .insert({
                    user_id: userId,
                    filename: file.name,
                    file_url: storagePath,
                    file_type: file.type === 'application/pdf' ? 'pdf' : 'image',
                    file_size: file.size,
                    language,
                    status: 'uploaded',
                })
                .select()
                .single()

            if (dbError) {
                return NextResponse.json({ error: 'Failed to save document record.' }, { status: 500 })
            }

            // Trigger OCR extraction asynchronously (fire and forget)
            fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/extract`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Pass auth cookie via internal call — for route-to-route, use service key
                },
                body: JSON.stringify({ documentId: document.id, language }),
            }).catch(console.error)

            return NextResponse.json({ success: true, document })
        } catch (err) {
            console.error('Upload error:', err)
            return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
        }
    }
)
