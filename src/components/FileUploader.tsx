'use client'

import { useCallback, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, ImageIcon, X, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface FileUploaderProps {
    onFileSelect: (file: File) => void
    uploading?: boolean
    uploadProgress?: number
    error?: string
}

export function FileUploader({ onFileSelect, uploading = false, uploadProgress = 0, error }: FileUploaderProps) {
    const [dragOver, setDragOver] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [validationError, setValidationError] = useState('')

    const validateAndSelect = useCallback((file: File) => {
        setValidationError('')

        if (!ACCEPTED_TYPES.includes(file.type)) {
            setValidationError('Please upload a PDF, JPG, PNG, or WebP file.')
            return
        }

        if (file.size > MAX_FILE_SIZE) {
            setValidationError('File size must be under 10MB.')
            return
        }

        setSelectedFile(file)
        onFileSelect(file)
    }, [onFileSelect])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) validateAndSelect(file)
    }, [validateAndSelect])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) validateAndSelect(file)
    }

    const clearFile = () => {
        setSelectedFile(null)
        setValidationError('')
    }

    const displayError = error || validationError

    return (
        <div className="space-y-3">
            {/* Drop Zone */}
            <Card
                className={cn(
                    'border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden',
                    dragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30',
                    selectedFile && 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !selectedFile && document.getElementById('file-input')?.click()}
            >
                <div className="p-8 flex flex-col items-center gap-3 text-center">
                    {selectedFile ? (
                        <>
                            {selectedFile.type === 'application/pdf' ? (
                                <FileText className="h-12 w-12 text-emerald-500" />
                            ) : (
                                <ImageIcon className="h-12 w-12 text-emerald-500" />
                            )}
                            <div>
                                <p className="font-semibold text-sm">{selectedFile.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                            <Badge variant="secondary" className="text-emerald-700 bg-emerald-100 dark:bg-emerald-900">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Ready to process
                            </Badge>
                        </>
                    ) : (
                        <>
                            <div className="p-4 rounded-full bg-muted">
                                <Upload className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-semibold">Drop your file here</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    PDF, JPG, PNG or WebP · Max 10MB
                                </p>
                            </div>
                            <Button variant="outline" size="sm" type="button">
                                Browse Files
                            </Button>
                        </>
                    )}
                </div>
            </Card>

            <input
                id="file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleInputChange}
            />

            {/* Upload Progress */}
            {uploading && (
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-1.5" />
                </div>
            )}

            {/* Error */}
            {displayError && (
                <p className="text-sm text-destructive">{displayError}</p>
            )}

            {/* Clear button */}
            {selectedFile && !uploading && (
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground w-full"
                    onClick={clearFile}
                >
                    <X className="h-4 w-4 mr-1" /> Remove file
                </Button>
            )}
        </div>
    )
}
