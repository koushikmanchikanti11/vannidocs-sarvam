'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, Download, Edit3, FileText } from 'lucide-react'

interface TextDisplayProps {
    text: string
    onTextChange?: (text: string) => void
    readonly?: boolean
}

export function TextDisplay({ text, onTextChange, readonly = false }: TextDisplayProps) {
    const [copied, setCopied] = useState(false)
    const [editing, setEditing] = useState(false)
    const [editValue, setEditValue] = useState(text)

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleSave = () => {
        onTextChange?.(editValue)
        setEditing(false)
    }

    const handleDownload = () => {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'extracted-text.txt'
        a.click()
        URL.revokeObjectURL(url)
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length
    const charCount = text.length

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">Extracted Text</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-xs">
                        {wordCount.toLocaleString()} words · {charCount.toLocaleString()} chars
                    </Badge>
                    {!readonly && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => { setEditing(!editing); setEditValue(text) }}
                            title="Edit text"
                        >
                            <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleCopy}
                        title="Copy"
                    >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleDownload}
                        title="Download as TXT"
                    >
                        <Download className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Text Area */}
            {editing ? (
                <div className="space-y-2">
                    <textarea
                        className="w-full min-h-[200px] p-4 text-sm font-mono rounded-lg border bg-background resize-y focus:outline-none focus:ring-2 focus:ring-primary"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleSave}>Save Changes</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                    </div>
                </div>
            ) : (
                <Card className="p-4 max-h-72 overflow-y-auto bg-muted/30">
                    <p className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                        {text || 'No text to display.'}
                    </p>
                </Card>
            )}
        </div>
    )
}
