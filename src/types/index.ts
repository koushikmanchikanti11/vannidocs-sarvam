// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
    id: string
    email: string
    full_name: string | null
    credits_remaining: number
    total_credits_used: number
    signup_bonus_claimed: boolean
    created_at: string
    updated_at: string
}

// ─── Document ─────────────────────────────────────────────────────────────────

export type FileType = 'pdf' | 'image'
export type DocumentStatus = 'uploaded' | 'processing' | 'completed' | 'failed'

export interface Document {
    id: string
    user_id: string
    filename: string
    file_url: string
    file_type: FileType
    file_size: number
    language: string
    upload_date: string
    status: DocumentStatus
    created_at: string
    updated_at: string
}

// ─── Extraction ─────────────────────────────────────────────────────────────

export interface Extraction {
    id: string
    document_id: string
    extracted_text: string
    word_count: number
    extraction_date: string
    sarvam_request_id: string | null
    created_at: string
}

// ─── Audio File ───────────────────────────────────────────────────────────────

export type VoiceProvider = 'sarvam' | 'elevenlabs'

export interface AudioFile {
    id: string
    extraction_id: string
    audio_url: string
    voice_provider: VoiceProvider
    voice_id: string
    duration_seconds: number
    character_count: number
    synthesis_date: string
    created_at: string
}

// ─── Credits ─────────────────────────────────────────────────────────────────

export type TransactionType =
    | 'signup_bonus'
    | 'ocr_deduction'
    | 'tts_deduction'
    | 'refund'
    | 'admin_grant'

export interface CreditTransaction {
    id: string
    user_id: string
    transaction_type: TransactionType
    amount: number
    balance_after: number
    description: string
    metadata: Record<string, unknown> | null
    created_at: string
}

// ─── Usage Logs ───────────────────────────────────────────────────────────────

export interface UsageLog {
    id: string
    user_id: string
    action_type: 'ocr' | 'tts'
    api_provider: VoiceProvider
    credits_used: number
    timestamp: string
}

// ─── Language ─────────────────────────────────────────────────────────────────

export interface Language {
    code: string
    name: string
    nativeName: string
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface APIError {
    error: string
    details?: string
}

export interface UploadResponse {
    success: boolean
    document: Document
}

export interface ExtractResponse {
    success: boolean
    extraction: Extraction
    text: string
    confidence: number
    creditsDeducted: number
}

export interface SynthesizeResponse {
    success: boolean
    audioUrl: string
    audioFile: AudioFile
    creditsDeducted: number
}

export interface OCRStatusResponse {
    status: DocumentStatus
    progress: number
    text?: string
    confidence?: number
}
