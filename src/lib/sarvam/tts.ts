export interface TTSSynthesizeOptions {
    text: string
    language: string
    speaker?: string
    pitch?: number
    pace?: number
    enable_preprocessing?: boolean
}

export interface TTSSynthesizeResult {
    audioBuffer: Buffer
    duration_seconds: number
}

// Supported Sarvam TTS speakers per language
export const SARVAM_SPEAKERS: Record<string, string[]> = {
    hi: ['meera', 'kalpana', 'arvind', 'amartya'],
    ta: ['meera', 'kalpana'],
    te: ['meera'],
    kn: ['meera'],
    ml: ['meera'],
    bn: ['meera'],
    gu: ['meera'],
    mr: ['meera', 'kalpana'],
    pa: ['meera'],
    od: ['meera'],
    as: ['meera'],
    ur: ['meera'],
}

export class SarvamTTSClient {
    private apiKey: string
    private endpoint: string

    constructor() {
        this.apiKey = process.env.SARVAM_API_KEY!
        this.endpoint =
            process.env.SARVAM_TTS_ENDPOINT ?? 'https://api.sarvam.ai/text-to-speech'
    }

    async synthesize(options: TTSSynthesizeOptions): Promise<TTSSynthesizeResult> {
        const speakers = SARVAM_SPEAKERS[options.language] ?? ['meera']
        const speaker = options.speaker ?? speakers[0]

        const langCode = options.language.includes('-')
            ? options.language
            : `${options.language}-IN`

        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-subscription-key': this.apiKey,
            },
            body: JSON.stringify({
                inputs: [options.text],
                target_language_code: langCode,
                speaker,
                speech_sample_rate: 22050,
                enable_preprocessing: true,
                model: 'bulbul:v3',
            }),
        })

        if (!response.ok) {
            const error = await response.text()
            throw new Error(`Sarvam TTS API error: ${response.status} - ${error}`)
        }

        const data = await response.json()

        const audioBase64: string = data.audios?.[0] ?? data.audio ?? ''
        const audioBuffer = Buffer.from(audioBase64, 'base64')

        const wordCount = options.text.split(/\s+/).length
        const duration_seconds = Math.ceil((wordCount / 150) * 60)

        return { audioBuffer, duration_seconds }
    }
}
