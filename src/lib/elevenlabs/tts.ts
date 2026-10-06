export interface ElevenLabsSynthesizeOptions {
    text: string
    voiceId?: string
    modelId?: string
}

export interface ElevenLabsSynthesizeResult {
    audioBuffer: Buffer
    duration_seconds: number
}

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'
const MAX_CHAR_LIMIT = 4500 // safe limit

export class ElevenLabsTTSClient {
    private apiKey: string
    private baseUrl = 'https://api.elevenlabs.io/v1'

    constructor() {
        if (!process.env.ELEVENLABS_API_KEY) {
            throw new Error('ELEVENLABS_API_KEY is not set')
        }
        this.apiKey = process.env.ELEVENLABS_API_KEY
    }

    async synthesize(
        options: ElevenLabsSynthesizeOptions
    ): Promise<ElevenLabsSynthesizeResult> {
        const voiceId = options.voiceId ?? DEFAULT_VOICE_ID
        const modelId = options.modelId ?? 'eleven_multilingual_v2'

        // ✅ CLEAN TEXT
        const cleanedText = this.cleanText(options.text)

        if (!cleanedText.trim()) {
            throw new Error('Text is empty after cleaning.')
        }

        // ✅ LIMIT SIZE
        const safeText = cleanedText.slice(0, MAX_CHAR_LIMIT)

        const response = await fetch(
            `${this.baseUrl}/text-to-speech/${voiceId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': this.apiKey,
                },
                body: JSON.stringify({
                    text: safeText,
                    model_id: modelId,
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                }),
            }
        )

        if (!response.ok) {
            const error = await response.text()
            console.error("ElevenLabs error:", error)
            throw new Error(
                `ElevenLabs TTS API error: ${response.status}`
            )
        }

        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = Buffer.from(arrayBuffer)

        const wordCount = safeText.split(/\s+/).length
        const duration_seconds = Math.ceil((wordCount / 150) * 60)

        return { audioBuffer, duration_seconds }
    }

    private cleanText(text: string): string {
        return text
            // remove HTML tags
            .replace(/<[^>]*>/g, ' ')
            // remove markdown tables
            .replace(/\|.*\|/g, ' ')
            // remove markdown headers
            .replace(/^#+\s+/gm, '')
            // remove bold/italic markers
            .replace(/[*_~`]/g, '')
            // remove extra spaces
            .replace(/\s+/g, ' ')
            .trim()
    }
}