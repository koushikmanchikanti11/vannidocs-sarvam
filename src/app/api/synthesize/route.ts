import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SarvamTTSClient } from '@/lib/sarvam/tts'
import { ElevenLabsTTSClient } from '@/lib/elevenlabs/tts'
import { CreditManager } from '@/lib/credits/creditManager'
import { cleanForTTS } from '@/lib/sanitize'

export async function POST(req: Request) {
    try {
        const { extractionId, text, language, voiceId } = await req.json()

        if (!text || !language) {
            return NextResponse.json({ error: 'text and language are required.' }, { status: 400 })
        }

        // Sanitize OCR text: strip markdown, HTML, code blocks, URLs, etc.
        const cleanedText = cleanForTTS(text)

        if (!cleanedText.trim()) {
            return NextResponse.json({ error: 'Text is empty after sanitization.' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
        }

        // Flat cost: 1 credit per TTS request
        const creditsRequired = 1

        const hasCredits = await CreditManager.hasEnoughCredits(user.id, creditsRequired)
        if (!hasCredits) {
            return NextResponse.json({ error: 'Insufficient credits.' }, { status: 402 })
        }

        let audioBuffer: Buffer
        let provider: 'sarvam' | 'elevenlabs' = 'sarvam'

        // Try Sarvam TTS first, fallback to ElevenLabs
        try {
            const sarvamClient = new SarvamTTSClient()
            const result = await sarvamClient.synthesize({ text: cleanedText, language, speaker: voiceId })
            audioBuffer = result.audioBuffer
        } catch (sarvamErr) {
            console.warn('Sarvam TTS failed, falling back to ElevenLabs:', sarvamErr)
            provider = 'elevenlabs'
            const elevenLabsClient = new ElevenLabsTTSClient()
            const result = await elevenLabsClient.synthesize({ text: cleanedText, voiceId })
            audioBuffer = result.audioBuffer
        }

        // Upload audio to Supabase Storage
        const audioPath = `${user.id}/${Date.now()}.mp3`
        const { error: uploadError } = await supabase.storage
            .from('audio')
            .upload(audioPath, audioBuffer, {
                contentType: 'audio/mpeg',
                upsert: false,
            })

        if (uploadError) {
            return NextResponse.json({ error: 'Failed to store audio.' }, { status: 500 })
        }

        const { data: { publicUrl: audioUrl } } = supabase.storage.from('audio').getPublicUrl(audioPath)

        // Create audio_files record
        const { data: audioFile } = await supabase
            .from('audio_files')
            .insert({
                extraction_id: extractionId || null,
                audio_url: audioPath,
                voice_provider: provider,
                voice_id: voiceId || 'default',
                character_count: cleanedText.length,
            })
            .select()
            .single()

        // Deduct credits
        await CreditManager.deductCredits(user.id, creditsRequired, 'tts', {
            extraction_id: extractionId,
            chars: cleanedText.length,
            provider,
        })

        return NextResponse.json({
            success: true,
            audioUrl,
            audioFile,
            creditsDeducted: creditsRequired,
        })
    } catch (err) {
        console.error('Synthesize error:', err)
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
    }
}
