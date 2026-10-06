'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FileUploader } from '@/components/FileUploader'
import { LanguageSelector } from '@/components/LanguageSelector'
import { RealtimeOCRPreview } from '@/components/RealtimeOCRPreview'
import { TextDisplay } from '@/components/TextDisplay'
import { AudioPlayer } from '@/components/AudioPlayer'
import { Loader2, Mic, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { cleanForTTS } from '@/lib/sanitize'

type Step = 'upload' | 'ocr' | 'tts' | 'done'

export default function ConvertPage() {
    const [step, setStep] = useState<Step>('upload')
    const [file, setFile] = useState<File | null>(null)
    const [language, setLanguage] = useState('hi')
    const [uploading, setUploading] = useState(false)
    const [documentId, setDocumentId] = useState('')
    const [extractedText, setExtractedText] = useState('')
    const [editedText, setEditedText] = useState('')
    const [generating, setGenerating] = useState(false)
    const [audioUrl, setAudioUrl] = useState('')

    // Step 1: Upload file
    async function handleUpload() {
        if (!file) return
        setUploading(true)

        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('language', language)

            const res = await fetch('/api/upload', { method: 'POST', body: formData })
            const data = await res.json()

            if (!res.ok) {
                toast.error(data.error || 'Upload failed.')
                return
            }

            setDocumentId(data.document.id)
            setStep('ocr')
        } catch {
            toast.error('Upload failed. Please try again.')
        } finally {
            setUploading(false)
        }
    }

    // Called when OCR completes
    function handleOCRComplete(text: string) {
        setExtractedText(text)
        // Sanitize raw OCR markdown/HTML for natural TTS output
        setEditedText(cleanForTTS(text))
        setStep('tts')
    }

    // Step 3: Generate audio
    async function handleGenerateAudio() {
        if (!editedText.trim()) {
            toast.error('No text to synthesize.')
            return
        }
        setGenerating(true)

        try {
            const res = await fetch('/api/synthesize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ extractionId: documentId, text: editedText, language }),
            })

            const data = await res.json()

            if (!res.ok) {
                toast.error(data.error || 'Audio generation failed.')
                return
            }

            setAudioUrl(data.audioUrl)
            setStep('done')
        } catch {
            toast.error('Audio generation failed.')
        } finally {
            setGenerating(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Convert Document</h1>
                <p className="text-muted-foreground text-sm mt-1">Upload a PDF or image, extract text, and generate audio.</p>
            </div>

            {/* Step 1: Upload */}
            {(step === 'upload') && (
                <Card className="p-6 space-y-5">
                    <h2 className="font-semibold flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                        Upload Document
                    </h2>
                    <FileUploader onFileSelect={setFile} uploading={uploading} />
                    <LanguageSelector value={language} onChange={setLanguage} label="Document Language" />
                    <Button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="w-full"
                    >
                        {uploading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…</>
                        ) : (
                            <>Extract Text <ArrowRight className="ml-2 h-4 w-4" /></>
                        )}
                    </Button>
                </Card>
            )}

            {/* Step 2: OCR */}
            {step === 'ocr' && (
                <div className="space-y-4">
                    <h2 className="font-semibold flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                        Extracting Text
                    </h2>
                    <RealtimeOCRPreview
                        documentId={documentId}
                        language={language}
                        onComplete={handleOCRComplete}
                    />
                </div>
            )}

            {/* Step 3: TTS */}
            {(step === 'tts' || step === 'done') && (
                <div className="space-y-5">
                    <h2 className="font-semibold flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                        Review & Generate Audio
                    </h2>

                    <TextDisplay text={editedText} onTextChange={setEditedText} />

                    <LanguageSelector value={language} onChange={setLanguage} label="Speech Language" />

                    {step === 'tts' && (
                        <Button
                            onClick={handleGenerateAudio}
                            disabled={generating || !editedText}
                            className="w-full"
                        >
                            {generating ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating audio…</>
                            ) : (
                                <><Mic className="mr-2 h-4 w-4" /> Generate Audio</>
                            )}
                        </Button>
                    )}

                    {step === 'done' && audioUrl && (
                        <AudioPlayer audioUrl={audioUrl} label="Generated Audio" />
                    )}
                </div>
            )}
        </div>
    )
}
