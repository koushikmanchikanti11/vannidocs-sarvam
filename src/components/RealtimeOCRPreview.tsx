'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import type { DocumentStatus } from '@/types'

interface RealtimeOCRPreviewProps {
    documentId: string
    language: string
    onComplete?: (text: string, confidence: number) => void
}

export function RealtimeOCRPreview({ documentId, language, onComplete }: RealtimeOCRPreviewProps) {
    const [status, setStatus] = useState<DocumentStatus>('processing')
    const [progress, setProgress] = useState(5)
    const [extractedText, setExtractedText] = useState('')
    const [confidence, setConfidence] = useState(0)
    const [errorMsg, setErrorMsg] = useState('')
    const extractStarted = useRef(false)
    // Keep a stable ref to onComplete so it never causes effect re-runs
    const onCompleteRef = useRef(onComplete)
    useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

    useEffect(() => {
        if (!documentId || extractStarted.current) return
        extractStarted.current = true

        let intervalId: ReturnType<typeof setInterval>

        // Step 1: Trigger the actual OCR extraction job
        async function startExtraction() {
            try {
                const res = await fetch('/api/extract', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ documentId, language }),
                })

                const data = await res.json()

                if (!res.ok) {
                    setStatus('failed')
                    setErrorMsg(data.error || 'Extraction failed.')
                    return
                }

                // If extract returned text directly (sync path), we're done
                if (data.text) {
                    setExtractedText(data.text)
                    setConfidence(data.confidence ?? 0.9)
                    setProgress(100)
                    setStatus('completed')
                    onCompleteRef.current?.(data.text, data.confidence ?? 0.9)
                    return
                }

                // Otherwise fall through to polling
                startPolling()
            } catch {
                setStatus('failed')
                setErrorMsg('Network error. Please try again.')
            }
        }

        // Step 2: Poll status until completed or failed
        function startPolling() {
            let count = 0

            intervalId = setInterval(async () => {
                try {
                    const res = await fetch(`/api/extract/status?documentId=${documentId}`)
                    const data = await res.json()

                    count++
                    setProgress(Math.min(data.progress ?? count * 8, 90))

                    if (data.status === 'completed') {
                        clearInterval(intervalId)
                        setStatus('completed')
                        setExtractedText(data.text ?? '')
                        setConfidence(data.confidence ?? 0.9)
                        setProgress(100)
                        onCompleteRef.current?.(data.text ?? '', data.confidence ?? 0.9)
                    } else if (data.status === 'failed') {
                        clearInterval(intervalId)
                        setStatus('failed')
                        setErrorMsg('Extraction failed on server. Please try again.')
                    }
                } catch {
                    // Silently retry on network blip
                }
            }, 2000)
        }

        startExtraction()

        return () => {
            if (intervalId) clearInterval(intervalId)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documentId, language])

    return (
        <Card className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base">OCR Extraction</h3>
                {status === 'processing' && (
                    <Badge variant="secondary">
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        Processing
                    </Badge>
                )}
                {status === 'completed' && (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600">
                        <CheckCircle className="mr-1.5 h-3 w-3" />
                        Completed
                    </Badge>
                )}
                {status === 'failed' && (
                    <Badge variant="destructive">
                        <AlertCircle className="mr-1.5 h-3 w-3" />
                        Failed
                    </Badge>
                )}
            </div>

            {/* Progress */}
            {status === 'processing' && (
                <div className="space-y-1.5">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                        Extracting text with Sarvam Vision… {progress}%
                    </p>
                </div>
            )}

            {/* Text Preview */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Extracted Text Preview</p>
                    {confidence > 0 && (
                        <Badge variant="outline" className="text-xs">
                            {(confidence * 100).toFixed(0)}% confidence
                        </Badge>
                    )}
                </div>

                {status === 'processing' && (
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                )}

                {status === 'completed' && (
                    <div className="p-4 bg-muted/50 rounded-lg border max-h-60 overflow-y-auto">
                        <p className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                            {extractedText || 'No text extracted.'}
                        </p>
                    </div>
                )}

                {status === 'failed' && (
                    <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
                        <p className="text-sm text-destructive">
                            {errorMsg || 'Failed to extract text. Please try again.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Counts */}
            {extractedText && (
                <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
                    <span>Characters: {extractedText.length.toLocaleString()}</span>
                    <span>Words: {extractedText.split(/\s+/).filter(Boolean).length.toLocaleString()}</span>
                </div>
            )}
        </Card>
    )
}
